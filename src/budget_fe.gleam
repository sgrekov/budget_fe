import budget_fe/internals/effects as eff
import budget_fe/internals/msg.{type Model, type Msg, Model}
import budget_fe/internals/view as v
import budget_test.{
  type Allocation, type Category, type Cycle, type MonthInYear, type Transaction,
  type User, Allocation, Category, Cycle, MonthInYear, Transaction, User,
} as m
import date_utils
import gleam/dict
import gleam/int
import gleam/io
import gleam/list
import gleam/option.{type Option, None, Some}
import gleam/result
import gleam/set
import lustre
import lustre/effect
import modem
import rada/date.{type Date} as d

pub fn main() {
  let app = lustre.application(init, update, v.view)
  let assert Ok(_) = lustre.start(app, "#app", Nil)

  Nil
}

fn init(_flags) -> #(Model, effect.Effect(Msg)) {
  #(
    msg.Model(
      current_user: User(id: "initial", name: "Initial"),
      all_users: [],
      cycle: m.calculate_current_cycle(),
      route: msg.Home,
      cycle_end_day: option.Some(26),
      show_all_transactions: False,
      categories_groups: [],
      categories: [],
      transactions: [],
      allocations: [],
      selected_category: option.None,
      show_add_category_ui: False,
      show_add_category_group_ui: False,
      user_category_name_input: "",
      transaction_add_input: msg.TransactionForm(
        "",
        "",
        option.None,
        option.None,
        False,
      ),
      target_edit: msg.TargetEdit("", False, m.Monthly(m.int_to_money(0))),
      selected_transaction: option.None,
      transaction_edit_form: option.None,
      suggestions: dict.new(),
      new_category_group_name: "",
    ),
    effect.batch([modem.init(eff.on_route_change), eff.initial_eff()]),
  )
}

fn update(model: Model, msg: Msg) -> #(Model, effect.Effect(Msg)) {
  io.debug(msg)
  case msg {
    msg.OnRouteChange(route) -> {
      #(Model(..model, route: route), effect.none())
    }
    msg.Initial(users, cycle, initial_path) -> {
      case users {
        Ok(users) -> #(
          Model(..model, all_users: users, cycle: cycle, route: initial_path),
          effect.batch([
            eff.get_category_groups(),
            eff.get_categories(),
            eff.get_transactions(),
            eff.get_allocations(),
            eff.read_localstorage("current_user_id"),
            eff.get_category_suggestions(),
          ]),
        )
        Error(_) -> #(model, effect.none())
      }
    }
    msg.CurrentSavedUser(Ok(user_id)) -> {
      let user = model.all_users |> list.find(fn(u) { u.id == user_id })
      case user {
        Ok(user) -> #(Model(..model, current_user: user), effect.none())
        Error(_) -> #(model, effect.none())
      }
    }
    msg.CurrentSavedUser(Error(_)) -> #(model, effect.none())
    msg.Categories(Ok(cats)) -> {
      #(Model(..model, categories: cats), eff.get_transactions())
    }
    msg.Categories(Error(_)) -> #(model, effect.none())
    msg.Transactions(Ok(t)) -> #(
      Model(
        ..model,
        transactions: t
          |> list.sort(by: fn(t1, t2) { d.compare(t2.date, t1.date) }),
      ),
      effect.none(),
    )
    msg.Transactions(Error(_)) -> #(model, effect.none())
    msg.Allocations(Ok(a)) -> #(Model(..model, allocations: a), effect.none())
    msg.Allocations(Error(_)) -> #(model, effect.none())
    msg.SelectCategory(c) -> #(
      Model(
        ..model,
        selected_category: option.Some(msg.SelectedCategory(
          c.id,
          c.name,
          find_alloc_by_cat_id(c.id, model.cycle, model.allocations)
            |> result.map(fn(a) { a.amount |> m.money_to_string_no_sign })
            |> result.unwrap(""),
        )),
      ),
      effect.none(),
    )
    msg.SelectUser(user) -> #(
      Model(..model, current_user: user),
      eff.write_localstorage("current_user_id", user.id),
    )
    msg.ShowAddCategoryUI -> #(
      Model(..model, show_add_category_ui: !model.show_add_category_ui),
      effect.none(),
    )
    msg.AddCategory -> #(
      Model(..model, user_category_name_input: ""),
      eff.add_category(model.user_category_name_input),
    )
    msg.UserUpdatedCategoryName(name) -> #(
      Model(..model, user_category_name_input: name),
      effect.none(),
    )
    msg.AddCategoryResult(Ok(_)) -> #(model, eff.get_categories())
    msg.AddCategoryResult(Error(_)) -> #(model, effect.none())
    msg.AddTransaction ->
      case
        model.transaction_add_input.category,
        model.transaction_add_input.amount
      {
        Some(cat), Some(money) -> #(
          Model(
            ..model,
            transaction_add_input: msg.TransactionForm(
              date: model.transaction_add_input.date,
              payee: "",
              category: option.None,
              amount: option.None,
              is_inflow: False,
            ),
          ),
          eff.add_transaction_eff(
            model.transaction_add_input,
            money,
            cat,
            model.current_user,
          ),
        )
        _, _ -> #(model, effect.none())
      }
    msg.AddTransactionResult(Ok(t)) -> #(
      Model(
        ..model,
        transactions: list.flatten([model.transactions, [t]])
          |> list.sort(by: fn(t1, t2) { d.compare(t2.date, t1.date) }),
      ),
      effect.none(),
    )
    msg.AddTransactionResult(Error(_)) -> #(model, effect.none())
    msg.UserUpdatedTransactionCategory(category_name) -> {
      let category =
        model.categories
        |> list.find(fn(c) { c.name == category_name })
        |> option.from_result
      #(
        Model(
          ..model,
          transaction_add_input: msg.TransactionForm(
            ..model.transaction_add_input,
            category: category,
          ),
        ),
        effect.none(),
      )
    }
    msg.UserUpdatedTransactionDate(date) -> #(
      Model(
        ..model,
        transaction_add_input: msg.TransactionForm(
          ..model.transaction_add_input,
          date: date,
        ),
      ),
      effect.none(),
    )
    msg.UserUpdatedTransactionPayee(payee) -> {
      let category = model.suggestions |> dict.get(payee)
      #(
        Model(
          ..model,
          transaction_add_input: msg.TransactionForm(
            ..model.transaction_add_input,
            payee: payee,
            category: category |> option.from_result,
          ),
        ),
        effect.none(),
      )
    }
    msg.UserUpdatedTransactionAmount(amount) -> #(
      Model(
        ..model,
        transaction_add_input: msg.TransactionForm(
          ..model.transaction_add_input,
          amount: int.parse(amount)
            |> result.map(fn(amount) { m.int_to_money(amount) })
            |> option.from_result,
        ),
      ),
      effect.none(),
    )
    msg.EditTarget(_) -> #(
      Model(
        ..model,
        target_edit: msg.TargetEdit(..model.target_edit, enabled: True),
      ),
      effect.none(),
    )
    msg.SaveTarget(c) -> {
      #(
        Model(
          ..model,
          target_edit: msg.TargetEdit(..model.target_edit, enabled: False),
        ),
        eff.save_target_eff(c, model.target_edit.target |> option.Some),
      )
    }
    msg.DeleteTarget(c) -> #(
      Model(
        ..model,
        target_edit: msg.TargetEdit(..model.target_edit, enabled: False),
      ),
      eff.delete_target_eff(c),
    )
    msg.UserTargetUpdateAmount(amount) -> {
      let amount = amount |> int.parse |> result.unwrap(0)
      let target = case model.target_edit.target {
        m.Custom(_, date) -> m.Custom(m.int_to_money(amount), date)
        m.Monthly(_) -> m.Monthly(m.int_to_money(amount))
      }
      #(
        Model(
          ..model,
          target_edit: msg.TargetEdit(..model.target_edit, target: target),
        ),
        effect.none(),
      )
    }
    msg.EditTargetCadence(is_monthly) -> {
      let target = case model.target_edit.target, is_monthly {
        m.Custom(money, _), True -> m.Monthly(money)
        m.Monthly(money), False -> m.Custom(money, date_to_month(d.today()))
        target, _ -> target
      }
      #(
        Model(
          ..model,
          target_edit: msg.TargetEdit(..model.target_edit, target: target),
        ),
        effect.none(),
      )
    }
    msg.UserTargetUpdateCustomDate(date) -> {
      let parsed_date =
        date_utils.from_date_string(date)
        |> result.lazy_unwrap(fn() { d.today() })
      let target = case model.target_edit.target {
        m.Custom(money, _) -> m.Custom(money, date_to_month(parsed_date))
        m.Monthly(money) -> m.Monthly(money)
      }
      #(
        Model(
          ..model,
          target_edit: msg.TargetEdit(..model.target_edit, target: target),
        ),
        effect.none(),
      )
    }
    msg.CategorySaveTarget(Ok(_)) -> #(model, eff.get_categories())
    msg.CategorySaveTarget(Error(_)) -> #(model, effect.none())
    msg.SelectTransaction(t) -> #(
      Model(..model, selected_transaction: option.Some(t.id)),
      effect.none(),
    )
    msg.DeleteTransaction(id) -> #(
      Model(..model, selected_transaction: option.None),
      eff.delete_transaction_eff(id),
    )
    msg.EditTransaction(t, category_name) -> #(
      Model(
        ..model,
        transaction_edit_form: option.Some(msg.TransactionEditForm(
          id: t.id,
          date: t.date |> date_utils.to_date_string_input,
          payee: t.payee,
          category_name: category_name,
          amount: t.value |> m.money_to_string_no_sign,
        )),
      ),
      effect.none(),
    )
    msg.TransactionDeleteResult(Ok(_)) -> #(model, eff.get_transactions())
    msg.TransactionDeleteResult(Error(_)) -> #(model, effect.none())
    msg.TransactionEditResult(Ok(_)) -> #(model, eff.get_transactions())
    msg.TransactionEditResult(Error(_)) -> #(model, effect.none())
    msg.UserTransactionEditPayee(payee) -> #(
      Model(
        ..model,
        transaction_edit_form: model.transaction_edit_form
          |> option.map(fn(tef) { msg.TransactionEditForm(..tef, payee: payee) }),
      ),
      effect.none(),
    )
    msg.UserTransactionEditDate(d) -> #(
      Model(
        ..model,
        transaction_edit_form: model.transaction_edit_form
          |> option.map(fn(tef) { msg.TransactionEditForm(..tef, date: d) }),
      ),
      effect.none(),
    )
    msg.UserTransactionEditAmount(a) -> #(
      Model(
        ..model,
        transaction_edit_form: model.transaction_edit_form
          |> option.map(fn(tef) { msg.TransactionEditForm(..tef, amount: a) }),
      ),
      effect.none(),
    )
    msg.UserTransactionEditCategory(c) -> #(
      Model(
        ..model,
        transaction_edit_form: model.transaction_edit_form
          |> option.map(fn(tef) {
            msg.TransactionEditForm(..tef, category_name: c)
          }),
      ),
      effect.none(),
    )
    msg.UpdateTransaction -> #(
      Model(
        ..model,
        selected_transaction: option.None,
        transaction_edit_form: option.None,
      ),
      case
        model.transaction_edit_form
        |> option.map(fn(tef) {
          transaction_form_to_transaction(
            tef,
            model.categories,
            model.current_user,
          )
        })
        |> option.flatten
      {
        option.None -> effect.none()
        option.Some(transaction) -> eff.update_transaction_eff(transaction)
      },
    )
    msg.DeleteCategory -> #(Model(..model, selected_category: option.None), case
      model.selected_category
    {
      option.None -> effect.none()
      option.Some(sc) -> eff.delete_category_eff(sc.id)
    })
    msg.UpdateCategoryName(cat) -> #(
      Model(..model, selected_category: option.None),
      case model.selected_category {
        option.Some(sc) ->
          eff.save_target_eff(Category(..cat, name: sc.input_name), cat.target)
        option.None -> effect.none()
      },
    )
    msg.UserInputCategoryUpdateName(name) -> #(
      Model(
        ..model,
        selected_category: model.selected_category
          |> option.map(fn(sc) { msg.SelectedCategory(..sc, input_name: name) }),
      ),
      effect.none(),
    )
    msg.CategoryDeleteResult(Ok(_)) -> #(model, eff.get_categories())
    msg.CategoryDeleteResult(Error(_)) -> #(model, effect.none())
    msg.SaveAllocation(alloc) -> #(model, case model.selected_category {
      option.Some(sc) -> {
        eff.save_allocation_eff(
          alloc,
          sc.allocation |> m.string_to_money,
          sc.id,
          model.cycle,
        )
      }
      option.None -> effect.none()
    })
    msg.SaveAllocationResult(Ok(_)) -> {
      #(model, eff.get_allocations())
    }
    msg.SaveAllocationResult(Error(_)) -> #(model, effect.none())
    msg.UserAllocationUpdate(a) -> #(
      Model(
        ..model,
        selected_category: model.selected_category
          |> option.map(fn(sc) { msg.SelectedCategory(..sc, allocation: a) }),
      ),
      effect.none(),
    )
    msg.CycleShift(shift) -> {
      let new_cycle = case shift {
        msg.ShiftLeft -> m.cycle_decrease(model.cycle)
        msg.ShiftRight -> m.cycle_increase(model.cycle)
      }
      #(
        Model(..model, cycle: new_cycle),
        effect.batch([eff.get_transactions(), eff.get_allocations()]),
      )
    }
    msg.UserInputShowAllTransactions(show) -> #(
      Model(..model, show_all_transactions: show),
      effect.none(),
    )
    msg.Suggestions(Ok(suggestions)) -> #(
      Model(..model, suggestions: suggestions),
      effect.none(),
    )
    msg.Suggestions(Error(_)) -> #(model, effect.none())
    msg.AllocateNeeded(cat, amount_needed, alloc) -> #(
      model,
      eff.save_allocation_eff(alloc, amount_needed, cat.id, model.cycle),
    )
    msg.CoverOverspent(cat, balance) -> #(model, case balance.is_neg {
      False -> effect.none()
      True -> eff.save_allocation_eff(option.None, balance, cat.id, model.cycle)
    })
    msg.ShowAddCategoryGroupUI -> #(
      Model(
        ..model,
        show_add_category_group_ui: !model.show_add_category_group_ui,
      ),
      effect.none(),
    )
    msg.UserUpdatedCategoryGroupName(input_group_name) -> #(
      Model(..model, new_category_group_name: input_group_name),
      effect.none(),
    )
    msg.CreateCategoryGroup -> #(
      model,
      eff.add_new_group_eff(model.new_category_group_name),
    )
    msg.AddCategoryGroupResult(Ok(id)) -> #(
      Model(
        ..model,
        new_category_group_name: "",
        show_add_category_group_ui: False,
      ),
      eff.get_category_groups(),
    )
    msg.AddCategoryGroupResult(Error(_)) -> #(model, effect.none())
    msg.CategoryGroups(Ok(groups)) -> #(
      Model(..model, categories_groups: groups),
      effect.none(),
    )
    msg.CategoryGroups(Error(_)) -> #(model, effect.none())
  }
}

fn transaction_form_to_transaction(
  tef: msg.TransactionEditForm,
  categories: List(Category),
  current_user: User,
) -> Option(Transaction) {
  let date_option =
    tef.date |> date_utils.from_date_string |> option.from_result
  let amount = tef.amount |> m.string_to_money
  let category =
    categories
    |> list.find(fn(c) { c.name == tef.category_name })
    |> option.from_result
  case date_option, category {
    Some(date), Some(category) ->
      Some(Transaction(
        id: tef.id,
        date: date,
        payee: tef.payee,
        category_id: category.id,
        value: amount,
        user_id: current_user.id,
      ))
    _, _ -> None
  }
}

// fn find_alloc_by_id(
//   allocations: List(Allocation),
//   id: String,
// ) -> Result(Allocation, Nil) {
//   allocations |> list.find(fn(a) { a.id == id })
// }

fn date_to_month(d: Date) -> MonthInYear {
  MonthInYear(d |> d.month_number, d |> d.year)
}

fn find_alloc_by_cat_id(
  cat_id: String,
  cycle: Cycle,
  allocations: List(Allocation),
) -> Result(Allocation, Nil) {
  allocations
  |> list.find(fn(a) { a.category_id == cat_id && a.date == cycle })
}
//<!---- Effects ----!>

// fn is_equal(date: d.Date, c: Cycle) -> Bool {
//   let d_mon = date |> d.month |> d.month_to_number()
//   let d_year = date |> d.year
//   d_mon == c.month |> d.month_to_number() && d_year == c.year
// }

// fn prepend(body: String, prefix: String) -> String {
//   prefix <> body
// }
