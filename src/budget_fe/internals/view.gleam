import budget_fe/internals/msg
import budget_fe/internals/msg.{
  type LoginForm, type Model, type Msg, type SelectedCategory,
} as _
import budget_shared.{
  type Allocation, type Category, type Cycle, type Money, type MonthInYear,
  type Transaction,
} as m
import date_utils
import formal/form.{type Form}
import gleam/int
import gleam/io
import gleam/list
import gleam/option.{None, Some}
import gleam/option.{type Option} as _
import gleam/string
import lustre/attribute
import lustre/effect
import lustre/element
import lustre/element/html
import lustre/event
import rada/date.{type Date} as d

pub fn view(model: Model) -> element.Element(Msg) {
  html.div([attribute.class("container-fluid")], [
    html.div([attribute.class("col")], [
      html.div([attribute.class("d-flex flex-row p-3")], [
        cycle_display(model),
        html.div(
          [
            // border border-dark
            attribute.class("d-flex flex-row  justify-content-center"),
            attribute.styles([#("width", "100%")]),
          ],
          [ready_to_assign(model)],
        ),
        html.div(
          [
            attribute.class("d-flex align-items-center fs-5"),
            attribute.styles([]),
          ],
          [
            case model.current_user {
              option.None -> html.text("")
              option.Some(user) -> html.text(user.name)
            },
          ],
        ),
      ]),
      html.div([attribute.class("d-flex flex-row")], [
        section_buttons(model.route),
      ]),
      html.div([attribute.class("d-flex flex-row")], [
        case model.current_user {
          option.None -> auth_screen(model.login_form)
          option.Some(_) ->
            case model.route {
              msg.Home -> budget_categories(model)
              msg.TransactionsRoute -> budget_transactions(model)
              msg.ImportTransactions -> import_transactions(model)
            }
        },
        html.div([], [category_details_ui(model)]),
      ]),
    ]),
  ])
}

fn auth_screen(form: LoginForm) -> element.Element(Msg) {
  html.div(
    [
      attribute.class("mt-3 rounded-3 p-2"),
      // attribute.styles([#("background-color", side_panel_color)]),
    ],
    [
      html.text("Log in:"),
      html.input([
        event.on_input(fn(login) {
          msg.LoginPassword(login: option.Some(login), pass: option.None)
        }),
        attribute.placeholder("Login"),
        attribute.class("form-control"),
        attribute.type_("text"),
        attribute.styles([#("width", "120px")]),
        attribute.value(form.login |> option.unwrap("")),
      ]),
      html.input([
        event.on_input(fn(pass) {
          msg.LoginPassword(login: option.None, pass: option.Some(pass))
        }),
        attribute.placeholder("Password"),
        attribute.class("form-control"),
        attribute.type_("password"),
        attribute.styles([#("width", "120px")]),
        attribute.value(form.pass |> option.unwrap("")),
      ]),
      html.button([attribute.class("mt-1"), event.on_click(msg.LoginSubmit)], [
        element.text("Login"),
      ]),
    ],
  )
}

fn ready_to_assign(model: Model) -> element.Element(Msg) {
  html.div(
    [
      attribute.class(" text-black rounded-3 p-2"),
      attribute.styles([
        #("width", "200px"),
        #("height", "fit-content"),
        #("background-color", "rgb(187, 235, 156)"),
      ]),
    ],
    [
      html.div([attribute.class("text-center fs-3 fw-bold")], [
        element.text(ready_to_assign_money(
          current_cycle_transactions(model),
          model.allocations,
          model.cycle,
          model.categories,
        )),
      ]),
      html.div([attribute.class("text-center")], [
        element.text("Ready to Assign"),
      ]),
    ],
  )
}

fn section_buttons(route: msg.Route) -> element.Element(Msg) {
  let #(cat_active, transactions_active, import_active) = case route {
    msg.Home -> #("active", "", "")
    msg.TransactionsRoute -> #("", "active", "")
    msg.ImportTransactions -> #("", "", "active")
  }

  html.div(
    [
      attribute.class("btn-group "),
      attribute.styles([#("height", "fit-content")]),
    ],
    [
      html.a(
        [
          attribute.attribute("aria-current", "page"),
          attribute.class("btn btn-primary " <> cat_active),
          attribute.href("/"),
        ],
        [html.text("Budget")],
      ),
      html.a(
        [
          attribute.class("btn btn-primary " <> transactions_active),
          attribute.href("/transactions"),
        ],
        [html.text("Transactions")],
      ),
      html.a(
        [
          attribute.class("btn btn-primary " <> import_active),
          attribute.href("/import"),
        ],
        [html.text("Import")],
      ),
    ],
  )
}

// fn row(fun: fn() -> List(element.Element(Msg))) -> element.Element(Msg) {
//   row2("", [], fun)
// }

fn row2(
  class: String,
  style: List(#(String, String)),
  fun: fn() -> List(element.Element(Msg)),
) -> element.Element(Msg) {
  html.div(
    [attribute.class("d-flex flex-row " <> class), attribute.styles(style)],
    fun(),
  )
}

fn column(fun: fn() -> List(element.Element(Msg))) -> element.Element(Msg) {
  column2("", [], fun)
}

fn column2(
  class: String,
  style: List(#(String, String)),
  fun: fn() -> List(element.Element(Msg)),
) -> element.Element(Msg) {
  html.div(
    [
      //border border-dark
      attribute.class("d-flex flex-column  p-1" <> class),
      attribute.styles(style),
    ],
    fun(),
  )
}

fn cycle_display(model: Model) -> element.Element(Msg) {
  row2("", [#("height", "fit-content")], fn() {
    [
      html.button(
        [
          attribute.class("btn btn-secondary mt-2 me-2"),
          attribute.styles([#("height", "fit-content")]),
          event.on_click(msg.CycleShift(msg.ShiftLeft)),
        ],
        [element.text("<")],
      ),
      column(fn() {
        [
          html.div(
            [
              attribute.class("text-center fs-4"),
              attribute.styles([
                #("justify-content", "center"),
                #("width", "170px"),
              ]),
            ],
            [element.text(model.cycle |> cycle_to_text())],
          ),
          html.div(
            [
              attribute.class("text-start fs-6"),
              attribute.styles([#("width", "200px")]),
            ],
            [element.text(current_cycle_bounds(model))],
          ),
        ]
      }),
      html.button(
        [
          attribute.class("btn btn-secondary mt-2 "),
          attribute.styles([#("height", "fit-content")]),
          event.on_click(msg.CycleShift(msg.ShiftRight)),
        ],
        [element.text(">")],
      ),
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
  html.div([attribute.class("col p-3")], [
    category_activity_ui(category, model),
    category_details_target_ui(category, model.target_edit_form),
    category_details_allocation_ui(sc, allocation),
    category_details_allocate_needed_ui(category, allocation, model),
    category_details_cover_overspent_ui(category, model, allocation),
    category_details_name_ui(category, sc),
    category_details_change_group_ui(category, model),
  ])
}

fn category_details_name_ui(
  category: Category,
  sc: SelectedCategory,
) -> element.Element(Msg) {
  html.div(
    [
      attribute.class("rounded-3 p-2 mt-3"),
      attribute.styles([
        #("height", "fit-content"),
        #("background-color", edit_name_side_panel_color),
      ]),
    ],
    [
      html.input([
        event.on_input(msg.UserInputCategoryUpdateName),
        attribute.placeholder("category name"),
        attribute.class("form-control"),
        attribute.type_("text"),
        attribute.styles([#("width", "200px")]),
        attribute.value(sc.input_name),
        attribute.class("mb-2"),
      ]),
      html.button(
        [
          attribute.class("me-3"),
          event.on_click(msg.UpdateCategoryName(category)),
        ],
        [element.text("Update")],
      ),
      html.button([event.on_click(msg.DeleteCategory)], [element.text("Delete")]),
    ],
  )
}

fn category_activity_ui(cat: Category, model: Model) -> element.Element(Msg) {
  html.div(
    [
      attribute.class("mt-3 rounded-3 p-2"),
      attribute.styles([#("background-color", activity_side_panel_color)]),
    ],
    [
      html.div([attribute.class("col")], [
        html.div([], [html.text("Activity")]),
        html.div([], [
          html.text(
            category_activity(cat, current_cycle_transactions(model))
            |> m.money_to_string,
          ),
        ]),
      ]),
    ],
  )
}

fn category_details_change_group_ui(
  cat: Category,
  model: Model,
) -> element.Element(Msg) {
  html.div(
    [
      attribute.class("mt-3 rounded-3 p-2"),
      attribute.styles([#("background-color", edit_name_side_panel_color)]),
    ],
    [
      html.text("Change group"),
      html.input([
        event.on_input(msg.UserInputCategoryGroupChange),
        attribute.placeholder("group"),
        attribute.class("form-control"),
        attribute.type_("text"),
        attribute.styles([#("width", "160px")]),
        attribute.attribute("list", "group_list"),
      ]),
      html.datalist(
        [attribute.id("group_list")],
        model.categories_groups
          |> list.map(fn(t) { t.name })
          |> list.map(fn(p) { html.option([attribute.value(p)], "") }),
      ),
      html.button(
        [
          attribute.class("mt-1"),
          event.on_click(msg.ChangeGroupForCategory(cat)),
        ],
        [element.text("Change group")],
      ),
    ],
  )
}

fn category_details_allocate_needed_ui(
  cat: Category,
  allocation: option.Option(Allocation),
  model: Model,
) -> element.Element(Msg) {
  let target_money = target_money(cat)
  let assigned = category_assigned(cat, model.allocations, model.cycle)
  let add_diff = m.Money(assigned.value - target_money.value)
  // let new_amount = m.money_sum(assigned, add_diff |> m.positivate)
  let new_amount =
    m.Money(assigned.value + { add_diff.value |> int.absolute_value })

  case add_diff.value < 0 {
    False -> html.text("")
    True -> {
      html.div([attribute.class("mt-3")], [
        html.button(
          [event.on_click(msg.AllocateNeeded(cat, new_amount, allocation))],
          [
            element.text(
              "Allocate needed " <> add_diff |> m.money_to_string_no_sign,
            ),
          ],
        ),
      ])
    }
  }
}

fn category_details_cover_overspent_ui(
  cat: Category,
  model: Model,
  allocation: option.Option(Allocation),
) -> element.Element(Msg) {
  let activity = category_activity(cat, current_cycle_transactions(model))
  let assigned = category_assigned(cat, model.allocations, model.cycle)
  let balance = m.money_sum(assigned, activity)

  case balance.value < 0 {
    False -> html.text("")
    True -> {
      html.div([attribute.class("mt-3")], [
        html.button(
          [
            event.on_click(msg.AllocateNeeded(
              cat: cat,
              needed_amount: m.Money(
                assigned.value + { balance.value |> int.absolute_value },
              ),
              alloc: allocation,
            )),
          ],
          [
            element.text(
              "Cover overspent " <> balance |> m.money_to_string_no_sign,
            ),
          ],
        ),
      ])
    }
  }
}

fn category_details_allocation_ui(
  sc: SelectedCategory,
  allocation: option.Option(Allocation),
) -> element.Element(Msg) {
  html.div(
    [
      attribute.class("mt-3 rounded-3 p-2"),
      attribute.styles([#("background-color", side_panel_color)]),
    ],
    [
      html.text("Allocated: "),
      html.input([
        event.on_input(msg.UserAllocationUpdate),
        attribute.placeholder("amount"),
        attribute.class("form-control"),
        attribute.type_("text"),
        attribute.styles([#("width", "120px")]),
        attribute.value(sc.allocation),
      ]),
      html.button(
        [
          attribute.class("mt-1"),
          event.on_click(msg.SaveAllocation(allocation: allocation)),
        ],
        [element.text("Save")],
      ),
    ],
  )
}

const edit_name_side_panel_color = "rgb(227, 216, 241)"

const side_panel_color = "rgb(134, 217, 192)"

const activity_side_panel_color = "rgb(197, 219, 212)"

fn category_details_target_ui(
  cat: Category,
  target_edit_option: option.Option(msg.TargetEditForm),
) -> element.Element(Msg) {
  html.div(
    [
      attribute.class("mt-3 rounded-3 p-2 col mt-3"),
      attribute.styles([#("background-color", side_panel_color)]),
    ],
    case target_edit_option {
      // edit mode
      option.Some(target_edit) -> {
        [
          html.div([], [
            html.text("Target"),
            html.button(
              [
                attribute.class("ms-3 me-1"),
                event.on_click(msg.SaveTarget(cat)),
              ],
              [element.text("Save")],
            ),
            html.button([event.on_click(msg.DeleteTarget(cat))], [
              element.text("Delete"),
            ]),
          ]),
          target_switcher_ui(target_edit),
          case target_edit.is_custom {
            True -> {
              io.debug(target_edit.target_custom_date)
              let target_date =
                target_edit.target_custom_date |> option.unwrap("")
              html.div([attribute.class("mt-1")], [
                html.text("Amount needed for date: "),
                html.input([
                  event.on_input(msg.UserTargetUpdateAmount),
                  attribute.placeholder("amount"),
                  attribute.class("form-control"),
                  attribute.type_("text"),
                  attribute.styles([#("width", "120px")]),
                  attribute.value(target_edit.target_amount),
                ]),
                html.input([
                  event.on_input(msg.UserTargetUpdateCustomDate),
                  attribute.placeholder("date"),
                  attribute.class("form-control mt-1"),
                  attribute.type_("date"),
                  attribute.value(target_date),
                ]),
              ])
            }
            False -> {
              html.div([attribute.class("mt-1")], [
                html.text("Amount monthly: "),
                html.input([
                  event.on_input(msg.UserTargetUpdateAmount),
                  attribute.placeholder("amount"),
                  attribute.class("form-control"),
                  attribute.type_("text"),
                  attribute.styles([#("width", "120px")]),
                  attribute.value(target_edit.target_amount),
                ]),
              ])
            }
          },
        ]
      }
      // view mode
      option.None -> {
        [
          html.div([], [
            html.text("Target"),
            html.button(
              [
                attribute.class("ms-3"),
                event.on_click(msg.StartEditTarget(cat)),
              ],
              [element.text("Edit")],
            ),
          ]),
          html.div([attribute.class("mt-2")], [html.text(target_string(cat))]),
        ]
      }
    },
  )
}

fn category_activity(cat: Category, transactions: List(Transaction)) -> Money {
  transactions
  |> list.filter(fn(t) { t.category_id == cat.id })
  |> list.fold(m.Money(0), fn(m, t) { m.money_sum(m, t.value) })
}

fn target_switcher_ui(et: msg.TargetEditForm) -> element.Element(Msg) {
  let #(monthly, custom) = case et.is_custom {
    True -> #("", "active")
    False -> #("active", "")
  }
  html.div(
    [
      attribute.attribute("aria-label", "Basic example"),
      attribute.role("group"),
      attribute.class("btn-group mt-1"),
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
    option.None -> m.Money(0)
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

fn ready_to_assign_money(
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
    |> list.fold(m.Money(0), fn(m, t) { m.money_sum(m, t.value) })

  let outcome =
    allocations
    |> list.filter_map(fn(a) {
      case a.date == cycle {
        True -> Ok(a.amount)
        False -> Error("")
      }
    })
    |> list.fold(m.Money(0), fn(m, t) { m.money_sum(m, t) })

  m.Money(income.value - outcome.value)
  |> m.money_to_string
}

fn check_box(
  label: String,
  is_checked: Bool,
  msg: fn(Bool) -> Msg,
) -> element.Element(Msg) {
  html.div([attribute.class("ms-2"), attribute.class("form-check")], [
    html.input([
      attribute.id("flexCheckDefault"),
      event.on_check(msg),
      attribute.type_("checkbox"),
      attribute.class("form-check-input"),
      attribute.checked(is_checked),
    ]),
    html.label(
      [attribute.for("flexCheckDefault"), attribute.class("form-check-label")],
      [html.text(label)],
    ),
  ])
}

fn budget_transactions(model: Model) -> element.Element(Msg) {
  html.div([attribute.class("d-flex flex-column flex-fill")], [
    check_box(
      "Show all transactions",
      model.show_all_transactions,
      msg.UserInputShowAllTransactions,
    ),
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
          [
            add_transaction_ui(
              model.transactions,
              model.categories,
              model.transaction_add_input,
            ),
          ],
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

@external(javascript, "./app.ffi.mjs", "get_file_content")
pub fn do_get_file_content(callback: fn(String) -> Nil) -> Nil

pub fn get_file_content() -> effect.Effect(Msg) {
  effect.from(fn(dispatch) {
    let file_read_callback = fn(file_content: String) -> Nil {
      file_content
      |> msg.SystemReadFile
      |> dispatch
    }
    do_get_file_content(file_read_callback)
  })
}

fn import_transactions(model: Model) -> element.Element(Msg) {
  html.div([attribute.class("w-100")], [
    html.div([], [
      html.input([
        attribute.type_("file"),
        attribute.accept([".xml", ".csv"]),
        attribute.id("file-input"),
        event.on_change(fn(str) -> Msg { msg.UserUpdatedFile }),
      ]),
      html.button(
        [
          attribute.class("float-end"),
          event.on_click(msg.ImportSelectedTransactions),
        ],
        [element.text("Import")],
      ),
    ]),
    html.table([attribute.class("table table-sm table-hover")], [
      html.thead([], [
        html.tr([], [
          //"Booking Date","Value Date","Partner Name","Partner Iban",Type,"Payment Reference","Account Name","Amount (EUR)"
          html.th([], [html.text("Date")]),
          html.th([], [html.text("Partner Name")]),
          html.th([], [html.text("Type")]),
          html.th([], [html.text("Reference")]),
          html.th([], [html.text("Amount")]),
        ]),
      ]),
      html.tbody(
        [],
        model.imported_transactions
          |> list.map(imported_transaction_list_item_html(_, model)),
      ),
    ]),
  ])
}

fn view_input(
  form: Form,
  is type_: String,
  name name: String,
  label label: String,
) -> element.Element(msg) {
  let state = form.field_state(form, name)

  html.div([], [
    html.label(
      [attribute.for(name), attribute.class("text-xs font-bold text-slate-600")],
      [html.text(label), html.text(": ")],
    ),
    html.input([
      attribute.type_(type_),
      // attribute.class(
      //   "block mt-1 w-full px-3 py-1 border rounded-lg focus:shadow",
      // ),
      // case state {
      //   Ok(_) -> attribute.class("focus:outline focus:outline-purple-600")
      //   Error(_) -> attribute.class("outline outline-red-500")
      // },
      // we use the `id` in the associated `for` attribute on the label.
      attribute.id(name),
      // the `name` attribute is used as the first element of the tuple
      // we receive for this input.
      attribute.name(name),
      // Associating a value with this element does _not_ make the element
      // controlled without an event listener, allowing us to set a default.
      attribute.value(form.value(form, name)),
    ]),
    // formal provides us with a customisable error message for every element
    // in case its validation fails, which we can show right below the input.
    case state {
      Ok(_) -> element.none()
      Error(error_message) ->
        html.p([attribute.class("mt-0.5 text-xs text-red-500")], [
          html.text(error_message),
        ])
    },
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

fn imported_transaction_list_item_html(
  it: m.ImportTransaction,
  model: Model,
) -> element.Element(Msg) {
  html.tr([], [
    //"Booking Date","Value Date","Partner Name","Partner Iban",Type,"Payment Reference","Account Name","Amount (EUR)"
    html.td([], [html.text(date_utils.to_date_string(it.date))]),
    html.td([], [html.text(it.payee)]),
    html.td([], [html.text(it.transaction_type)]),
    html.td([], [html.text(it.reference)]),
    html.td([], [html.text(it.value |> m.money_to_string)]),
  ])
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
        attribute.styles([#("width", "140px")]),
      ]),
    ]),
    html.td([], [
      html.input([
        event.on_input(msg.UserTransactionEditPayee),
        attribute.placeholder("payee"),
        attribute.value(tef.payee),
        attribute.class("form-control"),
        attribute.type_("text"),
        attribute.styles([#("width", "160px")]),
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
        attribute.styles([#("width", "160px")]),
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
        attribute.styles([#("width", "160px")]),
      ]),
      check_box("is inflow", tef.is_inflow, msg.UserEditTransactionIsInflow),
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
      html.div([attribute.class("mt-1")], [
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
        html.button(
          [attribute.class("ms-1"), event.on_click(msg.DeleteTransaction(t.id))],
          [element.text("Delete")],
        ),
      ])
  }
}

fn add_transaction_ui(
  transactions: List(Transaction),
  categories: List(Category),
  transaction_edit_form: msg.TransactionForm,
) -> element.Element(Msg) {
  html.tr([], [
    html.td([], [
      html.input([
        event.on_input(msg.UserUpdatedTransactionDate),
        attribute.placeholder("date"),
        attribute.id("addTransactionDateId"),
        attribute.class("form-control"),
        attribute.type_("date"),
        attribute.value(transaction_edit_form.date),
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
        attribute.value(transaction_edit_form.payee),
      ]),
      html.datalist(
        [attribute.id("payees_list")],
        transactions
          |> list.map(fn(t) { t.payee })
          |> list.unique()
          |> list.map(fn(p) { html.option([attribute.value(p)], "") }),
      ),
    ]),
    html.td([], [
      html.select(
        [
          event.on_input(msg.UserUpdatedTransactionCategory),
          attribute.class("form-select"),
          attribute.value(
            transaction_edit_form.category
            |> option.map(fn(c) { c.name })
            |> option.unwrap(""),
          ),
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
        attribute.styles([#("width", "120px")]),
        attribute.value(transaction_edit_form.amount),
      ]),
      check_box(
        "is inflow",
        transaction_edit_form.is_inflow,
        msg.UserUpdatedTransactionIsInflow,
      ),
      html.button(
        [attribute.class("ms-1"), event.on_click(msg.AddTransaction)],
        [element.text("Add")],
      ),
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
          html.text("Categories groups"),
          {
            let btn_label = case model.show_add_category_group_ui {
              True -> "-"
              False -> "+"
            }
            html.button(
              [
                attribute.class("ms-2"),
                event.on_click(msg.ShowAddCategoryGroupUI),
              ],
              [element.text(btn_label)],
            )
          },
        ]),
        html.th([], [html.text("Balance")]),
      ]),
    ]),
    html.tbody([], {
      let categories_groups_ui =
        category_group_list_item_ui(model.categories_groups, model)

      let add_cat_group_ui = case model.show_add_category_group_ui {
        False -> []
        True -> [
          html.tr([], [
            html.td([], [
              html.input([
                event.on_input(msg.UserUpdatedCategoryGroupName),
                attribute.placeholder("Category group name"),
                // attribute.id("exampleFormControlInput1"),
                attribute.class("form-control"),
                attribute.type_("text"),
              ]),
            ]),
            html.td([], [
              html.button([event.on_click(msg.CreateCategoryGroup)], [
                element.text("Create group"),
              ]),
            ]),
          ]),
        ]
      }

      list.flatten([add_cat_group_ui, categories_groups_ui])
    }),
  ])
}

fn category_group_list_item_ui(
  groups: List(m.CategoryGroup),
  model: Model,
) -> List(element.Element(Msg)) {
  groups
  |> list.flat_map(fn(group) { group_ui(group, model) })
}

fn group_ui(group: m.CategoryGroup, model: Model) -> List(element.Element(Msg)) {
  let is_current_group_active_add_ui = case model.show_add_category_ui {
    Some(group_id) -> group.id == group_id
    None -> False
  }

  let add_cat_ui = case is_current_group_active_add_ui {
    False -> html.text("")
    True ->
      html.tr([], [
        html.td([], [
          html.input([
            event.on_input(msg.UserUpdatedCategoryName),
            attribute.placeholder("category name"),
            attribute.id("exampleFormControlInput1"),
            attribute.class("form-control"),
            attribute.type_("text"),
            attribute.value(model.user_category_name_input),
          ]),
        ]),
        html.td([], [
          html.button([event.on_click(msg.AddCategory(group.id))], [
            element.text("Add"),
          ]),
        ]),
      ])
  }

  let add_btn = {
    let btn_label = case is_current_group_active_add_ui {
      True -> "-"
      False -> "+"
    }
    html.button(
      [attribute.class("ms-1"), event.on_click(msg.ShowAddCategoryUI(group.id))],
      [element.text(btn_label)],
    )
  }

  let collapse_ui = {
    let btn_label = case group.is_collapsed {
      True -> " ̬"
      False -> ">"
    }
    html.button(
      [attribute.class("ms-1"), event.on_click(msg.CollapseGroup(group))],
      [element.text(btn_label)],
    )
  }

  let group_ui =
    html.tr([attribute.styles([#("background-color", "rgb(199, 208, 201)")])], [
      html.td([], [html.text(group.name), add_btn, collapse_ui]),
      html.td([], []),
    ])
  let cats = case group.is_collapsed {
    False -> []
    True -> category_list_item_ui(model.categories, model, group)
  }

  cats
  |> list.prepend(add_cat_ui)
  |> list.prepend(group_ui)
}

fn category_list_item_ui(
  categories: List(Category),
  model: Model,
  group: m.CategoryGroup,
) -> List(element.Element(Msg)) {
  categories
  |> list.filter(fn(c) { !c.inflow && c.group_id == group.id })
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
      [event.on_click(msg.SelectCategory(c)), attribute.class(active_class)],
      [
        html.td([], [html.text(c.name)]),
        html.td([], [category_balance(c, model)]),
      ],
    )
  })
}

fn category_assigned(
  c: Category,
  allocations: List(Allocation),
  cycle: Cycle,
) -> Money {
  allocations
  |> list.filter(fn(a) { a.date == cycle })
  |> list.filter(fn(a) { a.category_id == c.id })
  |> list.fold(m.Money(0), fn(m, t) { m.money_sum(m, t.amount) })
}

fn category_balance(cat: Category, model: Model) -> element.Element(Msg) {
  let target_money = target_money(cat)
  let activity = category_activity(cat, current_cycle_transactions(model))
  let allocated = category_assigned(cat, model.allocations, model.cycle)
  let balance = m.money_sum(allocated, activity)
  let color = case balance |> m.is_zero_euro {
    True -> "rgb(137, 143, 138)"
    _ ->
      case balance.value < 0 {
        True -> "rgb(231, 41, 12)"
        False -> "rgba(64,185,78,1)"
      }
  }
  let add_alloc_diff = m.Money(allocated.value - target_money.value)

  let warn_text = case add_alloc_diff.value < 0 {
    False -> html.text("")
    True ->
      div_context(
        " Add more " <> add_alloc_diff |> m.money_with_currency_no_sign,
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
      attribute.styles([#("background-color", color), #("width", "fit-content")]),
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
