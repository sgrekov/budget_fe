import budget_fe/internals/factories.{allocations, categories, transactions}
import budget_fe/internals/model.{
  type Allocation, type Category, type Cycle, type MonthInYear,
  type Transaction, type User,
} as m
import budget_fe/internals/model.{
  Allocation, Category, Cycle, MonthInYear, Transaction, User,
}

import budget_fe/internals/effects as eff
import budget_fe/internals/msg.{Model} as _
import budget_fe/internals/msg.{
  type Model, type Msg, type Route, type TransactionForm,
}
import budget_fe/internals/view as v
import date_utils
import gleam/bool
import gleam/int
import gleam/io
import gleam/list
import gleam/option.{None, Some}
import gleam/option.{type Option} as _
import gleam/result
import gleam/uri.{type Uri}
import gluid
import lustre
import lustre/effect
import lustre_http
import modem.{initial_uri}
import rada/date.{type Date} as d

pub fn main() {
  // let today = d.from_calendar_date(2024, d.Nov, 1)
  // let feb = d.from_calendar_date(2024, d.Dec, 1)

  // let dates = date.range(date.Month, 1, today, feb)
  // io.debug(dates |> list.count(fn(d) { True }) |> int.to_string)
  // dates
  // |> list.each(fn(entry) { date.format(entry, "EEEE, d MMMM y") |> io.println })
  // io.debug(d.diff(d.Months, today, feb) |> int.to_string)
  let app = lustre.application(init, update, v.view)
  let assert Ok(_) = lustre.start(app, "#app", Nil)

  Nil
}

fn update(model: Model, msg: Msg) -> #(Model, effect.Effect(Msg)) {
  io.debug(msg)
  case msg {
    msg.OnRouteChange(route) -> {
      #(Model(..model, route: route), effect.none())
    }
    msg.Initial(user, cycle, initial_path) -> {
      // let #(start, end) = cycle_bounds(cycle, model.cycle_end_day)
      #(
        Model(..model, user: user, cycle: cycle, route: initial_path),
        effect.batch([
          get_categories(),
          get_transactions(),
          get_allocations(cycle),
        ]),
      )
    }
    msg.Categories(Ok(cats)) -> {
      #(Model(..model, categories: cats), get_transactions())
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
          find_alloc_by_cat_id(c.id, model.cycle)
            |> result.map(fn(a) { a.amount |> m.money_to_string_no_sign })
            |> result.unwrap(""),
        )),
      ),
      effect.none(),
    )
    msg.SelectUser(user) -> #(Model(..model, user: user), effect.none())
    msg.ShowAddCategoryUI -> #(
      Model(..model, show_add_category_ui: !model.show_add_category_ui),
      effect.none(),
    )
    msg.AddCategory -> #(
      Model(..model, user_category_name_input: ""),
      add_category(model.user_category_name_input),
    )
    msg.UserUpdatedCategoryName(name) -> #(
      Model(..model, user_category_name_input: name),
      effect.none(),
    )
    msg.AddCategoryResult(Ok(c)) -> #(
      Model(..model, categories: list.flatten([model.categories, [c]])),
      effect.none(),
    )
    msg.AddCategoryResult(Error(_)) -> #(model, effect.none())
    msg.AddTransaction -> #(
      Model(
        ..model,
        transaction_add_input: msg.TransactionForm(
          date: "",
          payee: "",
          category: option.None,
          amount: option.None,
          is_inflow: False,
        ),
      ),
      add_transaction_eff(model.transaction_add_input),
    )
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
      #(
        Model(
          ..model,
          transaction_add_input: msg.TransactionForm(
            ..model.transaction_add_input,
            category: model.categories
              |> list.find(fn(c) { c.name == category_name })
              |> option.from_result,
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
    msg.UserUpdatedTransactionPayee(payee) -> #(
      Model(
        ..model,
        transaction_add_input: msg.TransactionForm(
          ..model.transaction_add_input,
          payee: payee,
        ),
      ),
      effect.none(),
    )
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
    msg.CategorySaveTarget(Ok(cat)) -> #(
      Model(
        ..model,
        categories: model.categories
          |> list.map(fn(c) {
            case c.id == cat.id {
              False -> c
              True -> cat
            }
          }),
      ),
      effect.none(),
    )
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
          category: category_name,
          amount: t.value |> m.money_to_string_no_sign,
        )),
      ),
      effect.none(),
    )
    msg.TransactionDeleteResult(Ok(id)) -> #(
      Model(
        ..model,
        transactions: model.transactions |> list.filter(fn(t) { t.id != id }),
      ),
      effect.none(),
    )
    msg.TransactionDeleteResult(Error(_)) -> #(model, effect.none())
    msg.TransactionEditResult(Ok(transaction)) -> #(
      Model(
        ..model,
        transactions: model.transactions
          |> list.map(fn(t) {
            case t.id == transaction.id {
              True -> transaction
              False -> t
            }
          }),
      ),
      effect.none(),
    )
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
          |> option.map(fn(tef) { msg.TransactionEditForm(..tef, category: c) }),
      ),
      effect.none(),
    )
    msg.UpdateTransaction -> #(
      Model(
        ..model,
        selected_transaction: option.None,
        transaction_edit_form: option.None,
      ),
      case model.transaction_edit_form {
        option.None -> effect.none()
        option.Some(tef) -> eff.update_transaction_eff(tef, model.categories)
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
    msg.CategoryDeleteResult(Ok(id)) -> #(
      Model(
        ..model,
        categories: model.categories
          |> list.filter(fn(c) { c.id != id }),
      ),
      effect.none(),
    )
    msg.CategoryDeleteResult(Error(_)) -> #(model, effect.none())
    msg.SaveAllocation(a) -> #(model, case model.selected_category {
      option.Some(sc) ->
        eff.save_allocation_eff(a, sc.allocation, sc.id, model.cycle)
      option.None -> effect.none()
    })
    msg.SaveAllocationResult(Ok(aer)) -> {
      io.debug(
        "SaveAllocationResult Ok is_created:"
        <> aer.is_created |> bool.to_string,
      )
      #(
        Model(
          ..model,
          allocations: case aer.is_created {
            True -> list.append(model.allocations, [aer.alloc])
            False ->
              model.allocations
              |> list.map(fn(a) {
                case a.id == aer.alloc.id {
                  False -> a
                  True -> {
                    io.debug("SaveAllocationResult true")
                    aer.alloc
                  }
                }
              })
          },
        ),
        effect.none(),
      )
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
        msg.ShiftLeft -> cycle_decrease(model.cycle)
        msg.ShiftRight -> cycle_increase(model.cycle)
      }
      #(
        Model(..model, cycle: new_cycle),
        effect.batch([get_transactions(), get_allocations(new_cycle)]),
      )
    }
    msg.UserInputShowAllTransactions(show) -> #(
      Model(..model, show_all_transactions: show),
      effect.none(),
    )
  }
}

fn date_to_month(d: Date) -> MonthInYear {
  MonthInYear(d |> d.month_number, d |> d.year)
}

fn cycle_decrease(c: Cycle) -> Cycle {
  let mon_num = d.month_to_number(c.month)
  case mon_num {
    1 -> Cycle(c.year - 1, d.Dec)
    _ -> Cycle(c.year, d.number_to_month(mon_num - 1))
  }
}

fn cycle_increase(c: Cycle) -> Cycle {
  let mon_num = d.month_to_number(c.month)
  case mon_num {
    12 -> Cycle(c.year + 1, d.Jan)
    _ -> Cycle(c.year, d.number_to_month(mon_num + 1))
  }
}

fn find_alloc_by_cat_id(cat_id: String, cycle: Cycle) -> Result(Allocation, Nil) {
  allocations(cycle)
  |> list.find(fn(a) { a.category_id == cat_id && a.date == cycle })
}

fn calculate_current_cycle() -> Cycle {
  let today = d.today()
  let last_day = 26
  let cycle = Cycle(d.year(today), today |> d.month)
  case d.day(today) > last_day {
    False -> cycle
    True -> cycle_increase(cycle)
  }
}

fn init(_flags) -> #(Model, effect.Effect(Msg)) {
  #(
    msg.Model(
      user: User(id: "id1", name: "Sergey"),
      cycle: calculate_current_cycle(),
      route: msg.Home,
      cycle_end_day: option.Some(26),
      show_all_transactions: True,
      categories: [],
      transactions: [],
      allocations: [],
      selected_category: option.None,
      show_add_category_ui: False,
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
    ),
    effect.batch([modem.init(on_route_change), initial_eff()]),
  )
}

fn on_route_change(uri: Uri) -> Msg {
  let route = uri_to_route(uri)
  msg.OnRouteChange(route)
}

fn uri_to_route(uri: Uri) -> Route {
  case uri.path_segments(uri.path) {
    ["transactions"] -> msg.TransactionsRoute
    ["user"] -> msg.UserRoute
    _ -> msg.Home
  }
}

//<!---- Effects ----!>

fn initial_eff() -> effect.Effect(Msg) {
  let path = case initial_uri() {
    Ok(uri) -> uri_to_route(uri)
    _ -> msg.Home
  }
  effect.from(fn(dispatch) {
    dispatch(msg.Initial(
      User(id: "id2", name: "Sergey"),
      calculate_current_cycle(),
      path,
    ))
  })
}

fn add_transaction_eff(transaction_form: TransactionForm) -> effect.Effect(Msg) {
  effect.from(fn(dispatch) {
    dispatch(case transaction_form.category, transaction_form.amount {
      option.Some(cat), option.Some(amount) ->
        msg.AddTransactionResult(
          Ok(Transaction(
            id: gluid.guidv4(),
            date: transaction_form.date
              |> date_utils.from_date_string
              |> result.unwrap(d.today()),
            payee: transaction_form.payee,
            category_id: cat.id,
            value: amount,
          )),
        )
      _, _ ->
        msg.AddTransactionResult(
          Error(lustre_http.InternalServerError("parse error")),
        )
    })
  })
}

fn add_category(name: String) -> effect.Effect(Msg) {
  effect.from(fn(dispatch) {
    dispatch(
      msg.AddCategoryResult(
        Ok(Category(
          id: gluid.guidv4(),
          name: name,
          target: option.None,
          inflow: False,
        )),
      ),
    )
  })
}

fn get_allocations(cycle: Cycle) -> effect.Effect(Msg) {
  effect.from(fn(dispatch) {
    dispatch(msg.Allocations(a: Ok(allocations(cycle))))
  })
}

fn get_categories() -> effect.Effect(Msg) {
  effect.from(fn(dispatch) { dispatch(msg.Categories(cats: Ok(categories()))) })
}

fn get_transactions() -> effect.Effect(Msg) {
  effect.from(fn(dispatch) { dispatch(msg.Transactions(Ok(transactions()))) })
}
// fn is_equal(date: d.Date, c: Cycle) -> Bool {
//   let d_mon = date |> d.month |> d.month_to_number()
//   let d_year = date |> d.year
//   d_mon == c.month |> d.month_to_number() && d_year == c.year
// }

// fn prepend(body: String, prefix: String) -> String {
//   prefix <> body
// }
