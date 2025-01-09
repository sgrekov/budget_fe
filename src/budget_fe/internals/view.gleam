import budget_fe/internals/msg
import budget_fe/internals/msg.{
  type Model, type Msg, type SelectedCategory, type TargetEdit,
} as _
import budget_test.{
  type Allocation, type Category, type Cycle, type Money, type MonthInYear,
  type Transaction, type User,
} as m
import budget_test.{
  Allocation, Category, Cycle, Money, MonthInYear, Transaction, User,
}
import date_utils
import gleam/int
import gleam/list
import gleam/option.{None, Some}
import gleam/option.{type Option} as _
import gleam/string
import lustre/attribute
import lustre/element
import lustre/element/html
import lustre/event
import rada/date.{type Date} as d

pub fn view(model: Model) -> element.Element(Msg) {
  html.div([attribute.class("container-fluid")], [
    html.div([attribute.class("col")], [
      html.div([attribute.class("d-flex flex-row")], [
        html.div([attribute.class("btn-group")], [
          html.a(
            [
              attribute.attribute("aria-current", "page"),
              attribute.class("btn btn-primary active"),
              attribute.href("/"),
            ],
            [html.text("Budget")],
          ),
          html.a(
            [
              attribute.class("btn btn-primary"),
              attribute.href("/transactions"),
            ],
            [html.text("Transactions")],
          ),
        ]),
        cycle_display(model),
        html.div(
          [
            attribute.class("bg-success text-white"),
            attribute.style([#("width", "120px")]),
          ],
          [
            html.p([attribute.class("text-start fs-4")], [
              element.text(ready_to_assign(
                current_cycle_transactions(model),
                model.allocations,
                model.cycle,
                model.categories,
              )),
            ]),
            html.p([attribute.class("text-start")], [
              element.text("Ready to Assign"),
            ]),
          ],
        ),
        html.div(
          [
            attribute.class("bg-info ms-auto text-white"),
            attribute.style([#("width", "120px")]),
          ],
          [
            html.a([attribute.class(""), attribute.href("/user")], [
              html.text(model.current_user.name),
            ]),
          ],
        ),
      ]),
      html.div([attribute.class("d-flex flex-row")], [
        case model.route {
          msg.Home -> {
            budget_categories(model)
          }
          msg.TransactionsRoute -> budget_transactions(model)
          msg.UserRoute -> user_selection(model)
        },
        html.div([], [category_details_ui(model)]),
      ]),
    ]),
  ])
}

fn row(fun: fn() -> List(element.Element(Msg))) -> element.Element(Msg) {
  html.div([attribute.class("d-flex flex-row")], fun())
}

fn column(fun: fn() -> List(element.Element(Msg))) -> element.Element(Msg) {
  html.div(
    [
      attribute.class("d-flex flex-column border border-dark"),
      attribute.class("p-1"),
    ],
    fun(),
  )
}

fn cycle_display(model: Model) -> element.Element(Msg) {
  row(fn() {
    [
      html.button([event.on_click(msg.CycleShift(msg.ShiftLeft))], [
        element.text("<"),
      ]),
      column(fn() {
        [
          html.p([attribute.class("text-start fs-5")], [
            element.text(model.cycle |> cycle_to_text()),
          ]),
          html.p([attribute.class("text-start fs-10")], [
            element.text(current_cycle_bounds(model)),
          ]),
        ]
      }),
      html.button([event.on_click(msg.CycleShift(msg.ShiftRight))], [
        element.text(">"),
      ]),
    ]
  })
}

fn current_cycle_bounds(model: Model) -> String {
  let #(start, end) = cycle_bounds(model.cycle, model.cycle_end_day)
  start |> date_utils.to_date_string
  <> " - "
  <> end |> date_utils.to_date_string
}

fn category_details_ui(model: Model) -> element.Element(Msg) {
  let selected_cat = get_selected_category(model)
  case selected_cat, model.route, model.selected_category {
    option.Some(c), msg.Home, option.Some(sc) ->
      category_details(
        c,
        model,
        sc,
        category_cycle_allocation(model.allocations, model.cycle, c),
      )
    _, _, _ -> html.text("")
  }
}

fn category_cycle_allocation(
  allocations: List(Allocation),
  cycle: Cycle,
  c: Category,
) -> Option(Allocation) {
  allocations
  |> list.filter(fn(a) { a.date == cycle })
  |> list.find(fn(a) { a.category_id == c.id })
  |> option.from_result
}

fn get_selected_category(model: Model) -> Option(Category) {
  model.selected_category
  |> option.map(fn(selected_cat) {
    model.categories
    |> list.find(fn(cat) { cat.id == selected_cat.id })
    |> option.from_result
  })
  |> option.flatten
}

fn transaction_category_name(t: Transaction, cats: List(Category)) -> String {
  case list.find(cats, fn(c) { c.id == t.category_id }) {
    Ok(c) -> c.name
    _ -> "not found"
  }
}

fn cycle_to_text(c: Cycle) -> String {
  c.month |> date_utils.month_to_name() <> " " <> c.year |> int.to_string
}

fn user_selection(m: Model) -> element.Element(Msg) {
  html.div([attribute.class("d-flex flex-row")], [
    html.div(
      [attribute.class("btn-group")],
      m.all_users
        |> list.map(fn(user) {
          let active_class = case m.current_user.id == user.id {
            True -> "active"
            False -> ""
          }
          html.a(
            [
              attribute.class("btn btn-primary" <> active_class),
              attribute.href("#"),
              event.on_click(msg.SelectUser(user)),
            ],
            [html.text(user.name)],
          )
        }),
    ),
  ])
}

fn current_cycle_transactions(model: Model) -> List(Transaction) {
  let #(start, end) = cycle_bounds(model.cycle, model.cycle_end_day)
  list.filter(model.transactions, fn(t) { d.is_between(t.date, start, end) })
}

fn prev_month(year: Int, month: d.Month) -> #(Int, Int) {
  let mon_num = d.month_to_number(month)
  case mon_num {
    1 -> #(year - 1, 12)
    _ -> #(year, mon_num - 1)
  }
}

fn cycle_bounds(c: Cycle, cycle_end_day: Option(Int)) -> #(Date, Date) {
  case cycle_end_day {
    None -> #(
      d.from_calendar_date(c.year, c.month, 1),
      d.from_calendar_date(
        c.year,
        c.month,
        date_utils.days_in_month(c.year, c.month),
      ),
    )
    Some(last_day) -> {
      let #(prev_year, prev_month) = prev_month(c.year, c.month)
      #(
        d.from_calendar_date(
          prev_year,
          date_utils.month_by_number(prev_month),
          last_day + 1,
        ),
        d.from_calendar_date(c.year, c.month, last_day),
      )
    }
  }
}

fn category_details(
  category: Category,
  model: Model,
  sc: SelectedCategory,
  allocation: option.Option(Allocation),
) -> element.Element(Msg) {
  html.div([attribute.class("col")], [
    html.div([], [
      html.input([
        event.on_input(msg.UserInputCategoryUpdateName),
        attribute.placeholder("category name"),
        attribute.class("form-control"),
        attribute.type_("text"),
        attribute.style([#("width", "200px")]),
        attribute.value(sc.input_name),
      ]),
      html.button([event.on_click(msg.UpdateCategoryName(category))], [
        element.text("Update"),
      ]),
      html.button([event.on_click(msg.DeleteCategory)], [element.text("Delete")]),
    ]),
    html.div([attribute.class("row")], [
      html.div([attribute.class("col")], [
        html.div([], [html.text("Activity")]),
        html.div([], [
          html.text(
            category_activity(category, current_cycle_transactions(model))
            |> m.money_to_string,
          ),
        ]),
      ]),
    ]),
    category_target_ui(category, model.target_edit),
    html.div([], [
      html.text("Allocated: "),
      html.input([
        event.on_input(msg.UserAllocationUpdate),
        attribute.placeholder("amount"),
        attribute.class("form-control"),
        attribute.type_("text"),
        attribute.style([#("width", "120px")]),
        attribute.value(sc.allocation),
      ]),
      html.button([event.on_click(msg.SaveAllocation(allocation: allocation))], [
        element.text("Save"),
      ]),
    ]),
  ])
}

fn category_target_ui(c: Category, et: TargetEdit) -> element.Element(Msg) {
  case et.cat_id, et.enabled {
    _, True -> {
      html.div([attribute.class("col")], [
        html.div([], [
          html.text("Target"),
          html.button([event.on_click(msg.SaveTarget(c))], [
            element.text("Save"),
          ]),
          html.button([event.on_click(msg.DeleteTarget(c))], [
            element.text("Delete"),
          ]),
        ]),
        target_switcher_ui(et),
        case et.target {
          m.Custom(_, _) ->
            html.div([], [
              html.text("Amount needed for date: "),
              html.input([
                event.on_input(msg.UserTargetUpdateAmount),
                attribute.placeholder("amount"),
                attribute.class("form-control"),
                attribute.type_("text"),
                attribute.style([#("width", "120px")]),
              ]),
              html.input([
                event.on_input(msg.UserTargetUpdateCustomDate),
                attribute.placeholder("date"),
                attribute.class("form-control"),
                attribute.type_("date"),
              ]),
            ])
          m.Monthly(_) ->
            html.div([], [
              html.text("Amount monthly: "),
              html.input([
                event.on_input(msg.UserTargetUpdateAmount),
                attribute.placeholder("amount"),
                attribute.class("form-control"),
                attribute.type_("text"),
                attribute.style([#("width", "120px")]),
                attribute.style([#("width", "120px")]),
                attribute.style([#("width", "120px")]),
              ]),
            ])
        },
      ])
    }
    _, _ -> {
      html.div([attribute.class("col")], [
        html.div([], [
          html.text("Target"),
          html.button([event.on_click(msg.EditTarget(c))], [
            element.text("Edit"),
          ]),
        ]),
        html.div([], [html.text(target_string(c))]),
      ])
    }
  }
}

fn category_activity(cat: Category, transactions: List(Transaction)) -> Money {
  transactions
  |> list.filter(fn(t) { t.category_id == cat.id })
  |> list.fold(m.int_to_money(0), fn(m, t) { m.money_sum(m, t.value) })
}

fn target_switcher_ui(et: TargetEdit) -> element.Element(Msg) {
  let #(monthly, custom) = case et.target {
    m.Custom(_, _) -> #("", "active")
    m.Monthly(_) -> #("active", "")
  }
  html.div(
    [
      attribute.attribute("aria-label", "Basic example"),
      attribute.role("group"),
      attribute.class("btn-group"),
    ],
    [
      html.button(
        [
          event.on_click(msg.EditTargetCadence(True)),
          attribute.class("btn btn-primary" <> monthly),
          attribute.type_("button"),
        ],
        [html.text("Monthly")],
      ),
      html.button(
        [
          event.on_click(msg.EditTargetCadence(False)),
          attribute.class("btn btn-primary" <> custom),
          attribute.type_("button"),
        ],
        [html.text("Custom")],
      ),
    ],
  )
}

fn target_string(category: Category) -> String {
  case category.target {
    option.None -> ""
    option.Some(m.Custom(amount, date_till)) ->
      "Monthly: "
      <> custom_target_money_in_month(amount, date_till) |> m.money_to_string
      <> "\n till date: "
      <> month_to_string(date_till)
      <> " Total amount: "
      <> m.money_to_string(amount)
    option.Some(m.Monthly(amount)) -> "Monthly: " <> m.money_to_string(amount)
  }
}

fn target_money(category: Category) -> m.Money {
  case category.target {
    option.None -> m.int_to_money(0)
    option.Some(m.Custom(amount, date_till)) ->
      custom_target_money_in_month(amount, date_till)
    option.Some(m.Monthly(amount)) -> amount
  }
}

fn custom_target_money_in_month(m: m.Money, date: MonthInYear) -> m.Money {
  let final_date =
    d.from_calendar_date(date.year, d.number_to_month(date.month), 28)
  let months_count = d.diff(d.Months, d.today(), final_date) + 1
  m.divide_money(m, months_count)
}

fn ready_to_assign(
  transactions: List(Transaction),
  allocations: List(Allocation),
  cycle: Cycle,
  categories: List(Category),
) -> String {
  let income_cat_ids =
    categories
    |> list.filter_map(fn(c) {
      case c.inflow {
        True -> Ok(c.id)
        False -> Error("")
      }
    })
  let income =
    transactions
    |> list.filter(fn(t) { income_cat_ids |> list.contains(t.category_id) })
    |> list.fold(m.int_to_money(0), fn(m, t) { m.money_sum(m, t.value) })

  let outcome =
    allocations
    |> list.filter_map(fn(a) {
      case a.date == cycle {
        True -> Ok(a.amount)
        False -> Error("")
      }
    })
    |> list.fold(m.int_to_money(0), fn(m, t) { m.money_sum(m, t) })

  m.money_sum(income, m.negate(outcome))
  |> m.money_to_string
}

fn budget_transactions(model: Model) -> element.Element(Msg) {
  html.div([attribute.class("d-flex flex-column flex-fill")], [
    html.div([attribute.class("form-check")], [
      html.input([
        attribute.id("flexCheckDefault"),
        event.on_check(msg.UserInputShowAllTransactions),
        attribute.type_("checkbox"),
        attribute.class("form-check-input"),
        attribute.checked(model.show_all_transactions),
      ]),
      html.label(
        [attribute.for("flexCheckDefault"), attribute.class("form-check-label")],
        [html.text("Show all transactions")],
      ),
    ]),
    html.table([attribute.class("table table-sm table-hover")], [
      html.thead([], [
        html.tr([], [
          html.th([], [html.text("Date")]),
          html.th([], [html.text("Payee")]),
          html.th([], [html.text("Category")]),
          html.th([], [html.text("Amount")]),
        ]),
      ]),
      html.tbody(
        [],
        list.flatten([
          [add_transaction_ui(model.transactions, model.categories)],
          {
            case model.show_all_transactions {
              False ->
                current_cycle_transactions(model)
                |> list.map(transaction_list_item_html(_, model))
              True ->
                model.transactions
                |> list.map(transaction_list_item_html(_, model))
            }
          },
        ]),
      ),
    ]),
  ])
}

fn transaction_list_item_html(
  t: Transaction,
  model: Model,
) -> element.Element(Msg) {
  let selected_id = model.selected_transaction |> option.unwrap("")
  let active_class = case selected_id == t.id {
    True -> "table-active"
    False -> ""
  }
  let transaction_edit_id =
    model.transaction_edit_form
    |> option.map(fn(tef) { tef.id })
    |> option.unwrap("-1")
  let is_edit_mode = transaction_edit_id == t.id
  let category_name = transaction_category_name(t, model.categories)
  case is_edit_mode, model.transaction_edit_form {
    True, option.Some(tef) ->
      transaction_edit_ui(t, category_name, active_class, tef, model)
    _, _ ->
      html.tr(
        [
          event.on_click(msg.SelectTransaction(t)),
          attribute.class(active_class),
        ],
        [
          html.td([], [html.text(date_utils.to_date_string(t.date))]),
          html.td([], [html.text(t.payee)]),
          html.td([], [html.text(category_name)]),
          html.td([], [
            html.text(t.value |> m.money_to_string),
            manage_transaction_buttons(t, selected_id, category_name, False),
          ]),
        ],
      )
  }
}

fn transaction_edit_ui(
  transaction: Transaction,
  category_name: String,
  active_class: String,
  tef: msg.TransactionEditForm,
  model: Model,
) -> element.Element(Msg) {
  html.tr([attribute.class(active_class)], [
    html.td([], [
      html.input([
        event.on_input(msg.UserTransactionEditDate),
        attribute.placeholder("date"),
        attribute.value(tef.date),
        attribute.class("form-control"),
        attribute.type_("date"),
        attribute.style([#("width", "140px")]),
      ]),
    ]),
    html.td([], [
      html.input([
        event.on_input(msg.UserTransactionEditPayee),
        attribute.placeholder("payee"),
        attribute.value(tef.payee),
        attribute.class("form-control"),
        attribute.type_("text"),
        attribute.style([#("width", "160px")]),
        attribute.attribute("list", "payees_list"),
      ]),
      html.datalist(
        [attribute.id("payees_list")],
        model.transactions
          |> list.map(fn(t) { t.payee })
          |> list.map(fn(p) { html.option([attribute.value(p)], "") }),
      ),
    ]),
    html.td([], [
      html.input([
        event.on_input(msg.UserTransactionEditCategory),
        attribute.placeholder("category"),
        attribute.value(tef.category_name),
        attribute.class("form-control"),
        attribute.type_("text"),
        attribute.style([#("width", "160px")]),
        attribute.attribute("list", "categories_list"),
      ]),
      html.datalist(
        [attribute.id("categories_list")],
        model.categories
          |> list.map(fn(c) { c.name })
          |> list.map(fn(p) { html.option([attribute.value(p)], "") }),
      ),
    ]),
    html.td([], [
      html.input([
        event.on_input(msg.UserTransactionEditAmount),
        attribute.placeholder("amount"),
        attribute.value(tef.amount),
        attribute.class("form-control"),
        attribute.type_("text"),
        attribute.style([#("width", "160px")]),
      ]),
      {
        let selected_id = model.selected_transaction |> option.unwrap("")
        manage_transaction_buttons(
          transaction,
          selected_id,
          category_name,
          True,
        )
      },
    ]),
  ])
}

fn manage_transaction_buttons(
  t: Transaction,
  selected_id: String,
  category_name: String,
  is_edit: Bool,
) -> element.Element(Msg) {
  case selected_id == t.id {
    False -> html.text("")
    True ->
      html.div([], [
        case is_edit {
          True ->
            html.button([event.on_click(msg.UpdateTransaction)], [
              element.text("Save"),
            ])
          False ->
            html.button(
              [event.on_click(msg.EditTransaction(t, category_name))],
              [element.text("Edit")],
            )
        },
        html.button([event.on_click(msg.DeleteTransaction(t.id))], [
          element.text("Delete"),
        ]),
      ])
  }
}

fn add_transaction_ui(
  transactions: List(Transaction),
  categories: List(Category),
) -> element.Element(Msg) {
  html.tr([], [
    html.td([], [
      html.input([
        event.on_input(msg.UserUpdatedTransactionDate),
        attribute.placeholder("date"),
        attribute.id("addTransactionDateId"),
        attribute.class("form-control"),
        attribute.type_("date"),
      ]),
    ]),
    html.td([], [
      html.input([
        event.on_input(msg.UserUpdatedTransactionPayee),
        attribute.placeholder("payee"),
        attribute.id("addTransactionPayeeId"),
        attribute.class("form-control"),
        attribute.type_("text"),
        attribute.attribute("list", "payees_list"),
      ]),
      html.datalist(
        [attribute.id("payees_list")],
        transactions
          |> list.map(fn(t) { t.payee })
          |> list.map(fn(p) { html.option([attribute.value(p)], "") }),
      ),
    ]),
    html.td([], [
      html.select(
        [
          event.on_input(msg.UserUpdatedTransactionCategory),
          attribute.class("form-select"),
        ],
        categories
          |> list.map(fn(c) { c.name })
          |> list.map(fn(p) { html.option([attribute.value(p)], p) }),
      ),
    ]),
    html.td([attribute.class("d-flex flex-row")], [
      html.input([
        event.on_input(msg.UserUpdatedTransactionAmount),
        attribute.placeholder("amount"),
        attribute.id("addTransactionAmountId"),
        attribute.class("form-control"),
        attribute.type_("text"),
        attribute.style([#("width", "120px")]),
      ]),
      html.button([event.on_click(msg.AddTransaction)], [element.text("Add")]),
    ]),
  ])
}

fn budget_categories(model: Model) -> element.Element(Msg) {
  let size = case model.selected_category {
    option.None -> ""
    option.Some(_) -> "w-75"
  }
  html.table([attribute.class(size <> " table table-sm table-hover")], [
    html.thead([], [
      html.tr([], [
        html.th([], [
          html.text("Category"),
          {
            let btn_label = case model.show_add_category_ui {
              True -> "-"
              False -> "+"
            }
            html.button([event.on_click(msg.ShowAddCategoryUI)], [
              element.text(btn_label),
            ])
          },
        ]),
        html.th([], [html.text("Balance")]),
      ]),
    ]),
    html.tbody([], {
      let cats_ui =
        model.categories
        |> list.filter(fn(c) { !c.inflow })
        |> list.map(fn(c) {
          let active_class = case model.selected_category {
            option.None -> ""
            option.Some(selected_cat) ->
              case selected_cat.id == c.id {
                True -> "table-active"
                False -> ""
              }
          }
          html.tr(
            [
              event.on_click(msg.SelectCategory(c)),
              attribute.class(active_class),
            ],
            [
              html.td([], [html.text(c.name)]),
              html.td([], [category_balance(c, model)]),
            ],
          )
        })
      let add_cat_ui = case model.show_add_category_ui {
        False -> []
        True -> [
          html.tr([], [
            html.td([], [
              html.input([
                event.on_input(msg.UserUpdatedCategoryName),
                attribute.placeholder("category name"),
                attribute.id("exampleFormControlInput1"),
                attribute.class("form-control"),
                attribute.type_("text"),
              ]),
            ]),
            html.td([], [
              html.button([event.on_click(msg.AddCategory)], [
                element.text("Add"),
              ]),
            ]),
          ]),
        ]
      }

      list.flatten([add_cat_ui, cats_ui])
    }),
  ])
}

fn category_assigned(
  c: Category,
  allocations: List(Allocation),
  cycle: Cycle,
) -> Money {
  allocations
  |> list.filter(fn(a) { a.date == cycle })
  |> list.filter(fn(a) { a.category_id == c.id })
  |> list.fold(m.int_to_money(0), fn(m, t) { m.money_sum(m, t.amount) })
}

fn category_balance(cat: Category, model: Model) -> element.Element(Msg) {
  let target_money = target_money(cat)
  let activity = category_activity(cat, current_cycle_transactions(model))
  let assigned = category_assigned(cat, model.allocations, model.cycle)
  let balance = m.money_sum(assigned, activity)
  let color = case balance |> m.is_zero_int {
    True -> "rgb(137, 143, 138)"
    _ ->
      case balance |> m.is_neg {
        True -> "rgb(231, 41, 12)"
        False -> "rgba(64,185,78,1)"
      }
  }
  let add_diff = m.money_sum(assigned, target_money |> m.negate)
  let warn_text = case add_diff |> m.is_neg {
    False -> html.text("")
    True ->
      div_context(
        " Add more " <> add_diff |> m.money_to_string,
        "rgb(235, 199, 16)",
      )
  }
  html.div([attribute.class("d-flex flex-row")], [
    div_context(balance |> m.money_to_string, color),
    warn_text,
  ])
}

fn div_context(text: String, color: String) -> element.Element(Msg) {
  html.div(
    [
      attribute.class("ms-2 p-1"),
      attribute.style([#("background-color", color), #("width", "fit-content")]),
    ],
    [html.text(text)],
  )
}

pub fn month_to_string(value: MonthInYear) -> String {
  value.month
  |> int.to_string
  |> string.pad_start(2, "0")
  <> "."
  <> {
    value.year
    |> int.to_string
    |> string.pad_start(2, "0")
  }
}
// html.div([attribute.class("container-fluid bg-dark")], [
//   html.div([attribute.class("col")], [
//     html.div([attribute.class("d-flex flex-row")], [
//       html.div(
//         [
//           attribute.class("bg-warning border border-5"),
//           attribute.style([#("width", "120px")]),
//         ],
//         [html.text("TEST1")],
//       ),
//       html.div(
//         [
//           attribute.class("w-25"),
//           attribute.style([
//             #("width", "200px"),
//             #("background-color", "rgba(64,185,78,1)"),
//           ]),
//         ],
//         [html.text("TEST2")],
//       ),
//       html.div([attribute.class("ms-auto w-25 rounded-3 bg-danger")], [
//         html.text("TEST3"),
//       ]),
//     ]),
//   ]),
// ])
