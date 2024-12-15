import birl
import date_utils
import gleam/dynamic
import gleam/int
import gleam/io
import gleam/list
import gleam/option
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
}

type Msg {
  OnRouteChange(route: Route)
  Initial(user: User, cycle: Cycle, initial_route: Route)
  Categories(cats: Result(List(Category), lustre_http.HttpError))
  Transactions(trans: Result(List(Transaction), lustre_http.HttpError))
}

type Model {
  Model(
    user: User,
    cycle: Cycle,
    route: Route,
    categories: List(Category),
    transactions: List(Transaction),
  )
}

pub type Cycle {
  Cycle(year: Int, month: birl.Month)
}

pub type User {
  User(id: String, name: String)
}

pub type Category {
  Category(
    id: String,
    name: String,
    assigned: Money,
    target: option.Option(Target),
  )
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
  Allocation(amount: Money, catogory_id: String, target: Target)
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
      get_categories(),
    )
    Categories(Ok(cats)) -> #(
      Model(..model, categories: cats),
      get_transactions(),
    )
    Categories(Error(_)) -> #(model, effect.none())
    Transactions(Ok(t)) -> #(Model(..model, transactions: t), effect.none())
    Transactions(Error(_)) -> #(model, effect.none())
  }
}

fn init(_flags) -> #(Model, effect.Effect(Msg)) {
  io.debug("init")
  #(
    Model(User(id: "id1", name: "Sergey"), Cycle(2024, birl.Dec), Home, [], []),
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

fn get_categories() -> effect.Effect(Msg) {
  effect.from(fn(dispatch) {
    dispatch(
      Categories(
        cats: Ok([
          Category(
            id: "1",
            name: "Subscriptions",
            assigned: Money(s: 100, b: 0),
            target: option.None,
          ),
          Category(
            id: "2",
            name: "Shopping",
            assigned: Money(s: 1000, b: 0),
            target: option.None,
          ),
          Category(
            id: "3",
            name: "Goals",
            assigned: Money(s: 500, b: 0),
            target: option.None,
          ),
          Category(
            id: "4",
            name: "Vacation",
            assigned: Money(s: 200, b: 0),
            target: option.None,
          ),
          Category(
            id: "5",
            name: "Entertainment",
            assigned: Money(s: 300, b: 0),
            target: option.None,
          ),
          Category(
            id: "6",
            name: "Groceries",
            assigned: Money(s: 300, b: 0),
            target: option.None,
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
  html.div([attribute.class("container-fluid")], [
    html.div([attribute.class("row")], [
      html.div([attribute.class("col-md-12")], [
        html.div([attribute.class("row")], [
          html.div([attribute.role("group"), attribute.class("btn-group")], [
            html.button(
              [attribute.type_("button"), attribute.class("btn btn-secondary")],
              [html.a([attribute.href("/")], [element.text("Budget")])],
            ),
            html.button(
              [attribute.type_("button"), attribute.class("btn btn-secondary")],
              [
                html.a([attribute.href("/transactions")], [
                  element.text("Transactions"),
                ]),
              ],
            ),
          ]),
        ]),
      ]),
      case model.route {
        Home -> budget_categories(model.categories, model.transactions)
        TransactionsRoute ->
          budget_transactions(model.transactions, model.categories)
      },
    ]),
  ])
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
) -> element.Element(Msg) {
  html.table([attribute.class("table table-sm")], [
    html.thead([], [
      html.tr([], [
        html.th([], [html.text("Category")]),
        html.th([], [html.text("Assigned")]),
        html.th([], [html.text("Activity")]),
        html.th([], [html.text("Available")]),
      ]),
    ]),
    html.tbody(
      [],
      list.map(categories, fn(c) {
        html.tr([], [
          html.td([], [html.text(c.name)]),
          html.td([], [html.text(c.assigned |> money_to_string())]),
          html.td([], [html.text(category_activity(c, transactions))]),
          html.td([], [html.text("Default")]),
        ])
      }),
    ),
  ])
}

fn category_activity(cat: Category, transactions: List(Transaction)) -> String {
  let trcs = transactions |> list.filter(fn(t) { t.category_id == cat.id })
  list.fold(trcs, Money(0, 0), fn(m, t) { money_sum(m, t.value) })
  |> money_to_string
}

fn money_to_string(m: Money) -> String {
  "€" <> m.s |> int.to_string <> "." <> m.b |> int.to_string
}

fn money_sum(a: Money, b: Money) -> Money {
  let base_sum = a.b + b.b
  let #(euro, base) = case base_sum >= 100 {
    True -> #(1, base_sum % 100)
    False -> #(0, base_sum)
  }
  Money(a.s + b.s + euro, base)
}
