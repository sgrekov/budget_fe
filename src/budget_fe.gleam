import budget_fe/internals/effects as eff
import budget_fe/internals/msg.{type Model, type Msg, Model}
import budget_fe/internals/view as v
import budget_shared.{
  type Allocation, type Category, type Cycle, type Transaction, Category,
  Transaction,
} as m
import date_utils
import date_utils as budget_shared
import formal/form
import gleam/dict
import gleam/int
import gleam/io
import gleam/list
import gleam/option.{type Option, None, Some}
import gleam/result
import lustre
import lustre/effect
import modem
import rada/date as d

pub fn main() {
  let app = lustre.application(init, update, v.view)
  let assert Ok(_) = lustre.start(app, "#app", Nil)

  Nil
}

fn init(_flags) -> #(Model, effect.Effect(Msg)) {
  #(
    msg.Model(
      current_user: option.None,
      cycle: m.calculate_current_cycle(),
      route: msg.ImportTransactions,
      cycle_end_day: option.Some(26),
      show_all_transactions: False,
      categories_groups: [],
      categories: [],
      transactions: [],
      allocations: [],
      selected_category: option.None,
      show_add_category_ui: None,
      show_add_category_group_ui: False,
      user_category_name_input: "",
      transaction_add_input: msg.TransactionForm("", "", option.None, "", False),
      target_edit_form: option.None,
      selected_transaction: option.None,
      transaction_edit_form: option.None,
      suggestions: dict.new(),
      new_category_group_name: "",
      category_group_change_input: "",
      login_form: msg.LoginForm(None, None, False),
      import_form: msg.ImportForm(form.new()),
    ),
    effect.batch([
      modem.init(eff.on_route_change),
      eff.load_user_eff(),
      // eff.select_category_eff(),
    ]),
  )
}

fn update(model: Model, msg: Msg) -> #(Model, effect.Effect(Msg)) {
  io.debug(msg)
  case msg {
    msg.OnRouteChange(route) -> {
      #(Model(..model, route: route), effect.none())
    }
    msg.LoginSubmit -> #(
      Model(
        ..model,
        login_form: msg.LoginForm(
          login: option.None,
          pass: option.None,
          is_loading: True,
        ),
      ),
      eff.login_eff(
        model.login_form.login |> option.unwrap(""),
        model.login_form.pass |> option.unwrap(""),
      ),
    )
    msg.LoginPassword(l, p) -> {
      let login = case l {
        Some(l) -> Some(l)
        None -> model.login_form.login
      }
      let pass = case p {
        Some(p) -> Some(p)
        None -> model.login_form.pass
      }
      #(
        Model(
          ..model,
          login_form: msg.LoginForm(
            ..model.login_form,
            login: login,
            pass: pass,
          ),
        ),
        effect.none(),
      )
    }
    msg.LoginResult(Ok(#(user, token)), cycle) -> {
      let save_token_eff = case token {
        "" -> effect.none()
        _ -> eff.write_localstorage("jwt", token)
      }
      #(
        Model(..model, current_user: option.Some(user), cycle: cycle),
        effect.batch([
          save_token_eff,
          eff.get_category_groups(),
          eff.get_categories(),
          eff.get_transactions(),
          eff.get_allocations(),
          eff.get_category_suggestions(),
        ]),
      )
    }
    msg.LoginResult(Error(err), _) -> {
      io.debug(err)
      #(model, effect.none())
    }
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
        category_group_change_input: model.categories_groups
          |> list.find(fn(g) { g.id == c.group_id })
          |> result.map(fn(g) { g.name })
          |> result.unwrap(""),
        selected_category: option.Some(msg.SelectedCategory(
          c.id,
          c.name,
          find_alloc_by_cat_id(c.id, model.cycle, model.allocations)
            |> result.map(fn(a) { a.amount |> m.money_to_string_no_sign })
            |> result.unwrap(""),
        )),
        target_edit_form: option.None,
      ),
      effect.none(),
    )
    msg.ShowAddCategoryUI(group_id) -> #(
      Model(..model, show_add_category_ui: case model.show_add_category_ui {
        None -> Some(group_id)
        Some(current_group_id) ->
          case current_group_id == group_id {
            True -> None
            False -> Some(group_id)
          }
      }),
      effect.none(),
    )
    msg.AddCategory(group_id) -> #(
      Model(..model, user_category_name_input: ""),
      eff.add_category(model.user_category_name_input, group_id),
    )
    msg.UserUpdatedCategoryName(name) -> #(
      Model(..model, user_category_name_input: name),
      effect.none(),
    )
    msg.AddCategoryResult(Ok(_)) -> #(
      Model(..model, user_category_name_input: ""),
      eff.get_categories(),
    )
    msg.AddCategoryResult(Error(_)) -> #(model, effect.none())
    msg.AddTransaction ->
      case
        model.transaction_add_input.category,
        model.transaction_add_input.amount |> m.string_to_money
      {
        Some(cat), _ -> #(
          Model(
            ..model,
            transaction_add_input: msg.TransactionForm(
              date: model.transaction_add_input.date,
              payee: "",
              category: option.None,
              amount: "",
              is_inflow: False,
            ),
          ),
          eff.add_transaction_eff(
            model.transaction_add_input,
            model.transaction_add_input |> to_money,
            cat,
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
          amount: amount,
        ),
      ),
      effect.none(),
    )
    msg.UserUpdatedTransactionIsInflow(is_inflow) -> #(
      Model(
        ..model,
        transaction_add_input: msg.TransactionForm(
          ..model.transaction_add_input,
          is_inflow: is_inflow,
        ),
      ),
      effect.none(),
    )
    msg.StartEditTarget(c) -> #(
      Model(
        ..model,
        target_edit_form: msg.TargetEditForm(
            cat_id: c.id,
            target_amount: m.target_amount(c.target)
              |> option.map(m.money_to_string_no_sign)
              |> option.unwrap(""),
            target_custom_date: m.target_date(c.target)
              |> option.map(budget_shared.month_in_year_to_str),
            is_custom: m.is_target_custom(c.target),
          )
          |> option.Some,
      ),
      effect.none(),
    )
    msg.SaveTarget(c) -> {
      #(
        Model(..model, target_edit_form: option.None),
        eff.update_category_target_eff(c, model.target_edit_form),
      )
    }
    msg.DeleteTarget(c) -> #(
      Model(..model, target_edit_form: option.None),
      eff.delete_target_eff(c),
    )
    msg.UserTargetUpdateAmount(amount) -> {
      #(
        Model(
          ..model,
          target_edit_form: model.target_edit_form
            |> option.map(fn(form) {
              msg.TargetEditForm(..form, target_amount: amount)
            }),
        ),
        effect.none(),
      )
    }
    msg.EditTargetCadence(is_monthly) -> {
      #(
        Model(
          ..model,
          target_edit_form: model.target_edit_form
            |> option.map(fn(form) {
              msg.TargetEditForm(..form, is_custom: !is_monthly)
            }),
        ),
        effect.none(),
      )
    }
    msg.UserTargetUpdateCustomDate(date) -> {
      #(
        Model(
          ..model,
          target_edit_form: model.target_edit_form
            |> option.map(fn(form) {
              msg.TargetEditForm(
                ..form,
                target_custom_date: date |> option.Some,
              )
            }),
        ),
        effect.none(),
      )
    }
    msg.CategorySaveTarget(Ok(_)) -> #(model, eff.get_categories())
    msg.CategorySaveTarget(Error(_)) -> #(model, effect.none())
    msg.SelectTransaction(t) -> {
      let cur_selected_transaction =
        model.selected_transaction |> option.unwrap("")
      #(
        Model(
          ..model,
          selected_transaction: option.Some(t.id),
          transaction_edit_form: case cur_selected_transaction == t.id {
            True -> model.transaction_edit_form
            False -> option.None
          },
        ),
        effect.none(),
      )
    }
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
          is_inflow: t.value.value >= 0,
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
    msg.UserEditTransactionIsInflow(is_inflow) -> #(
      Model(
        ..model,
        transaction_edit_form: model.transaction_edit_form
          |> option.map(fn(tef) {
            msg.TransactionEditForm(..tef, is_inflow: is_inflow)
          }),
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
          transaction_form_to_transaction(tef, model.categories)
        })
        |> option.flatten
      {
        option.None -> effect.none()
        option.Some(transaction) -> eff.update_transaction_eff(transaction)
      },
    )
    msg.DeleteCategory -> #(
      Model(..model, selected_category: option.None),
      case model.selected_category {
        option.None -> effect.none()
        option.Some(sc) -> eff.delete_category_eff(sc.id)
      },
    )
    msg.UpdateCategoryName(cat) -> #(
      Model(..model, selected_category: option.None),
      case model.selected_category {
        option.Some(sc) ->
          eff.update_category_eff(Category(..cat, name: sc.input_name))
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
    // msg.CoverOverspent(cat, balance) -> #(model, case balance.value < 0 {
    //   False -> effect.none()
    //   True -> eff.save_allocation_eff(option.None, balance, cat.id, model.cycle)
    // })
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
    msg.AddCategoryGroupResult(Ok(_)) -> #(
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
    msg.CollapseGroup(group) -> #(
      model,
      // eff.update_group_eff(#(m.CategoryGroup(..group, is_collapsed: !group.is_collapsed))),
      eff.update_group_eff(
        m.CategoryGroup(..group, is_collapsed: !group.is_collapsed),
      ),
    )
    msg.CategoryGroups(Error(_)) -> #(model, effect.none())
    msg.ChangeGroupForCategory(cat) -> {
      let new_group =
        model.categories_groups
        |> list.find(fn(g) { g.name == model.category_group_change_input })
      case new_group {
        Error(_) -> #(model, effect.none())
        Ok(group) -> #(
          Model(..model, category_group_change_input: ""),
          eff.update_category_eff(Category(..cat, group_id: group.id)),
        )
      }
    }
    msg.UserInputCategoryGroupChange(group_name) -> #(
      Model(..model, category_group_change_input: group_name),
      effect.none(),
    )
    msg.UserSubmittedImportForm(_) -> #(Model(..model), effect.none())
    msg.UserSubmittedImportForm2 -> #(Model(..model), effect.none())
  }
}

fn to_money(tf: msg.TransactionForm) -> m.Money {
  let money = tf.amount |> m.string_to_money
  let sign = case tf.is_inflow {
    True -> 1
    False -> -1
  }
  m.Money({ money.value |> int.absolute_value } * sign)
}

fn transaction_form_to_transaction(
  tef: msg.TransactionEditForm,
  categories: List(Category),
) -> Option(Transaction) {
  let date_option =
    tef.date |> date_utils.from_date_string |> option.from_result

  let sign = case tef.is_inflow {
    True -> 1
    False -> -1
  }
  let amount =
    m.Money({ tef.amount |> m.string_to_money |> money_value } * sign)
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
        user_id: "",
      ))
    _, _ -> None
  }
}

fn money_value(m: m.Money) -> Int {
  m.value
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
