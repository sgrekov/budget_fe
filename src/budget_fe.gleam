import birl
import date_utils
import gleam/int
import gleam/io
import gleam/list
import gleam/option
import gleam/string
import gleam/uri.{type Uri}
import lustre
import lustre/attribute
import lustre/effect
import lustre/element
import lustre/element/html
import lustre/event
import lustre_http
import modem.{initial_uri}

type Route {
  Home
  TransactionsRoute
  UserRoute
}

type Msg {
  OnRouteChange(route: Route)
  Initial(user: User, cycle: Cycle, initial_route: Route)
  Categories(cats: Result(List(Category), lustre_http.HttpError))
  Transactions(trans: Result(List(Transaction), lustre_http.HttpError))
  Allocations(a: Result(List(Allocation), lustre_http.HttpError))
  SelectCategory(c: Category)
  SelectUser(u: User)
}

type Model {
  Model(
    user: User,
    cycle: Cycle,
    route: Route,
    categories: List(Category),
    transactions: List(Transaction),
    allocations: List(Allocation),
    selected_category: option.Option(Category),
  )
}

pub type Cycle {
  Cycle(year: Int, month: birl.Month)
}

pub type User {
  User(id: String, name: String)
}

pub type Category {
  Category(id: String, name: String, target: option.Option(Target))
}

pub type Money {
  //s - signature, b - base
  Money(s: Int, b: Int)
}

pub type Target {
  Monthly(target: Money)
  Custom(target: Money, date: MonthInYear)
}

pub type MonthInYear {
  MonthInYear(month: Int, year: Int)
}

pub type Allocation {
  Allocation(id: String, amount: Money, category_id: String, date: birl.Day)
}

pub type Transaction {
  Transaction(
    id: String,
    date: birl.Day,
    payee: String,
    category_id: String,
    value: Money,
    is_inflow: Bool,
  )
}

pub fn main() {
  let app = lustre.application(init, update, view)
  let assert Ok(_) = lustre.start(app, "#app", Nil)

  Nil
}

fn update(model: Model, msg: Msg) -> #(Model, effect.Effect(Msg)) {
  io.debug(msg)
  case msg {
    OnRouteChange(route) -> {
      #(Model(..model, route: route), effect.none())
    }
    Initial(user, cycle, initial_path) -> #(
      Model(..model, user: user, cycle: cycle, route: initial_path),
      effect.batch([get_categories(), get_transactions(), get_allocations()]),
    )
    Categories(Ok(cats)) -> #(
      Model(..model, categories: cats),
      get_transactions(),
    )
    Categories(Error(_)) -> #(model, effect.none())
    Transactions(Ok(t)) -> #(Model(..model, transactions: t), effect.none())
    Transactions(Error(_)) -> #(model, effect.none())
    Allocations(Ok(a)) -> #(Model(..model, allocations: a), effect.none())
    Allocations(Error(_)) -> #(model, effect.none())
    SelectCategory(c) -> #(
      Model(..model, selected_category: option.Some(c)),
      effect.none(),
    )
    SelectUser(user) -> #(Model(..model, user: user), effect.none())
  }
}

fn init(_flags) -> #(Model, effect.Effect(Msg)) {
  io.debug("init")
  #(
    Model(
      User(id: "id1", name: "Sergey"),
      Cycle(2024, birl.Dec),
      Home,
      [],
      [],
      [],
      option.Some(Category(
        id: "4",
        name: "Vacation",
        target: option.Some(Monthly(Money(100, 0))),
      )),
    ),
    effect.batch([modem.init(on_route_change), initial_eff()]),
  )
}

fn on_route_change(uri: Uri) -> Msg {
  io.debug("on_route_change")
  let route = uri_to_route(uri)
  OnRouteChange(route)
}

fn uri_to_route(uri: Uri) -> Route {
  case uri.path_segments(uri.path) {
    ["transactions"] -> TransactionsRoute
    ["user"] -> UserRoute
    _ -> Home
  }
}

//<!---- Effects ----!>

fn initial_eff() -> effect.Effect(Msg) {
  let path = case initial_uri() {
    Ok(uri) -> uri_to_route(uri)
    _ -> Home
  }
  effect.from(fn(dispatch) {
    dispatch(Initial(
      User(id: "id2", name: "Sergey"),
      Cycle(2024, birl.Dec),
      path,
    ))
  })
}

fn get_allocations() -> effect.Effect(Msg) {
  effect.from(fn(dispatch) {
    dispatch(
      Allocations(
        a: Ok([
          Allocation(
            id: "1",
            amount: Money(80, 0),
            category_id: "1",
            date: birl.Day(2024, 12, 2),
          ),
          Allocation(
            id: "2",
            amount: Money(120, 0),
            category_id: "2",
            date: birl.Day(2024, 12, 2),
          ),
          Allocation(
            id: "3",
            amount: Money(150, 0),
            category_id: "3",
            date: birl.Day(2024, 12, 2),
          ),
          Allocation(
            id: "4",
            amount: Money(100, 2),
            category_id: "4",
            date: birl.Day(2024, 12, 2),
          ),
          Allocation(
            id: "5",
            amount: Money(200, 2),
            category_id: "5",
            date: birl.Day(2024, 12, 2),
          ),
          Allocation(
            id: "6",
            amount: Money(500, 2),
            category_id: "6",
            date: birl.Day(2024, 12, 2),
          ),
        ]),
      ),
    )
  })
}

fn get_categories() -> effect.Effect(Msg) {
  effect.from(fn(dispatch) {
    dispatch(
      Categories(
        cats: Ok([
          Category(
            id: "1",
            name: "Subscriptions",
            target: option.Some(Monthly(Money(60, 0))),
          ),
          Category(
            id: "2",
            name: "Shopping",
            target: option.Some(Monthly(Money(40, 0))),
          ),
          Category(
            id: "3",
            name: "Goals",
            target: option.Some(Monthly(Money(150, 0))),
          ),
          Category(
            id: "4",
            name: "Vacation",
            target: option.Some(Monthly(Money(100, 0))),
          ),
          Category(
            id: "5",
            name: "Entertainment",
            target: option.Some(Monthly(Money(200, 0))),
          ),
          Category(
            id: "6",
            name: "Groceries",
            target: option.Some(Monthly(Money(500, 0))),
          ),
        ]),
      ),
    )
  })
}

fn get_transactions() -> effect.Effect(Msg) {
  effect.from(fn(dispatch) {
    dispatch(
      Transactions(
        Ok([
          Transaction(
            id: "1",
            date: birl.Day(2024, 12, 1),
            payee: "Amazon",
            category_id: "5",
            value: Money(50, 0),
            is_inflow: False,
          ),
          Transaction(
            id: "2",
            date: birl.Day(2024, 12, 2),
            payee: "Bauhaus",
            category_id: "5",
            value: Money(50, 0),
            is_inflow: False,
          ),
          Transaction(
            id: "3",
            date: birl.Day(2024, 12, 3),
            payee: "Rewe",
            category_id: "6",
            value: Money(50, 0),
            is_inflow: False,
          ),
          Transaction(
            id: "4",
            date: birl.Day(2024, 12, 4),
            payee: "Vodafone",
            category_id: "1",
            value: Money(50, 0),
            is_inflow: False,
          ),
          Transaction(
            id: "5",
            date: birl.Day(2024, 12, 5),
            payee: "Steam",
            category_id: "5",
            value: Money(50, 0),
            is_inflow: False,
          ),
          Transaction(
            id: "6",
            date: birl.Day(2024, 12, 6),
            payee: "Duo",
            category_id: "1",
            value: Money(50, 60),
            is_inflow: False,
          ),
          Transaction(
            id: "7",
            date: birl.Day(2024, 12, 7),
            payee: "O2",
            category_id: "1",
            value: Money(50, 0),
            is_inflow: False,
          ),
          Transaction(
            id: "8",
            date: birl.Day(2024, 12, 10),
            payee: "Trade Republic",
            category_id: "0",
            value: Money(1000, 0),
            is_inflow: True,
          ),
          Transaction(
            id: "8",
            date: birl.Day(2024, 12, 7),
            payee: "O2",
            category_id: "1",
            value: Money(100, 50),
            is_inflow: False,
          ),
        ]),
      ),
    )
  })
}

fn view(model: Model) -> element.Element(Msg) {
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
        html.div(
          [
            attribute.class("bg-success text-white"),
            attribute.style([#("width", "120px")]),
          ],
          [
            html.p([attribute.class("text-start fs-4")], [
              element.text(ready_to_assign(model.transactions)),
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
              html.text(model.user.name),
            ]),
          ],
        ),
      ]),
      html.div([attribute.class("d-flex flex-row")], [
        case model.route {
          Home -> {
            budget_categories(
              model.categories,
              model.transactions,
              model.allocations,
              model.selected_category,
            )
          }
          TransactionsRoute ->
            budget_transactions(model.transactions, model.categories)
          UserRoute -> user_selection(model)
        },
        html.div([], [
          case model.selected_category, model.route {
            option.Some(c), Home ->
              category_details(c, model.allocations, model.transactions)
            _, _ -> html.text("")
          },
        ]),
      ]),
    ]),
  ])
}

fn user_selection(m: Model) -> element.Element(Msg) {
  let #(serg_active_class, kate_active_class) = case m.user {
    User("id1", _) -> #("active", "")
    User(_, _) -> #("", "active")
  }

  html.div([attribute.class("d-flex flex-row")], [
    html.div([attribute.class("btn-group")], [
      html.a(
        [
          attribute.class("btn btn-primary" <> serg_active_class),
          attribute.href("#"),
          event.on_click(SelectUser(User(id: "id1", name: "Sergey"))),
        ],
        [html.text("Sergey")],
      ),
      html.a(
        [
          attribute.class("btn btn-primary" <> kate_active_class),
          attribute.href("#"),
          event.on_click(SelectUser(User(id: "id2", name: "Kate"))),
        ],
        [html.text("Ekaterina")],
      ),
    ]),
  ])
}

fn category_details(
  category: Category,
  allocations: List(Allocation),
  transactions: List(Transaction),
) -> element.Element(Msg) {
  html.div([attribute.class("row")], [
    html.div([attribute.class("col")], [
      html.div([], [html.text("Target")]),
      html.div([], [html.text(target_string(category))]),
    ]),
    html.div([attribute.class("col")], [
      html.div([], [html.text("Assigned")]),
      html.div([], [html.text(category_assigned(category, allocations))]),
    ]),
    html.div([attribute.class("col")], [
      html.div([], [html.text("Activity")]),
      html.div([], [html.text(category_activity(category, transactions))]),
    ]),
  ])
}

fn target_string(category: Category) -> String {
  case category.target {
    option.None -> ""
    option.Some(Custom(_, date_till)) ->
      "To date:" <> month_to_string(date_till)
    option.Some(Monthly(amount)) -> "Monthly: " <> money_to_string(amount)
  }
}

fn ready_to_assign(transactions: List(Transaction)) -> String {
  transactions
  |> list.filter(fn(t) { t.category_id == "0" })
  |> list.fold(Money(0, 0), fn(m, t) { money_sum(m, t.value) })
  |> money_to_string
}

fn budget_transactions(
  transactions: List(Transaction),
  categories: List(Category),
) -> element.Element(Msg) {
  html.table([attribute.class("table table-sm")], [
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
      list.map(transactions, fn(t) {
        html.tr([], [
          html.td([], [html.text(date_utils.to_date_string(t.date))]),
          html.td([], [html.text(t.payee)]),
          html.td([], [
            {
              let category_name = case
                list.find(categories, fn(c) { c.id == t.category_id })
              {
                Ok(c) -> c.name
                _ -> "not found"
              }
              html.text(category_name)
            },
          ]),
          html.td([], [
            {
              let sign = case t.is_inflow {
                True -> ""
                _ -> "-"
              }
              html.text(
                sign
                <> t.value.s |> int.to_string
                <> "."
                <> t.value.b |> int.to_string,
              )
            },
          ]),
        ])
      }),
    ),
  ])
}

fn budget_categories(
  categories: List(Category),
  transactions: List(Transaction),
  allocations: List(Allocation),
  active_category: option.Option(Category),
) -> element.Element(Msg) {
  let size = case active_category {
    option.None -> ""
    option.Some(_) -> "w-75"
  }
  html.table([attribute.class(size <> " table table-sm table-hover")], [
    html.thead([], [
      html.tr([], [
        html.th([], [html.text("Category")]),
        html.th([], [html.text("Balance")]),
      ]),
    ]),
    html.tbody(
      [],
      list.map(categories, fn(c) {
        let active_class = case active_category {
          option.None -> ""
          option.Some(selected_c) ->
            case selected_c.id == c.id {
              True -> "table-active"
              False -> ""
            }
        }
        html.tr(
          [event.on_click(SelectCategory(c)), attribute.class(active_class)],
          [
            html.td([], [html.text(c.id <> ": " <> c.name)]),
            html.td([], [html.text(category_target(c))]),
          ],
        )
      }),
    ),
  ])
}

fn category_assigned(c: Category, allocations: List(Allocation)) -> String {
  allocations
  |> list.filter(fn(a) { a.category_id == c.id })
  |> list.fold(Money(0, 0), fn(m, t) { money_sum(m, t.amount) })
  |> money_to_string
}

fn category_target(cat: Category) -> String {
  case cat.target {
    option.Some(v) ->
      case v {
        Monthly(value) -> money_to_string(value)
        Custom(_, _) -> ""
      }
    option.None -> ""
  }
}

fn category_activity(cat: Category, transactions: List(Transaction)) -> String {
  transactions
  |> list.filter(fn(t) { t.category_id == cat.id })
  |> list.fold(Money(0, 0), fn(m, t) { money_sum(m, t.value) })
  |> money_to_string
  |> prepend("-")
}

fn prepend(body: String, prefix: String) -> String {
  prefix <> body
}

fn money_to_string(m: Money) -> String {
  "€" <> money_to_string_no_sign(m)
}

fn money_to_string_no_sign(m: Money) -> String {
  m.s |> int.to_string <> "." <> m.b |> int.to_string
}

fn money_sum(a: Money, b: Money) -> Money {
  let base_sum = a.b + b.b
  let #(euro, base) = case base_sum >= 100 {
    True -> #(1, base_sum % 100)
    False -> #(0, base_sum)
  }
  Money(a.s + b.s + euro, base)
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
