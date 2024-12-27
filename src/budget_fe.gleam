// import birl
import date_utils
import gleam/int
import gleam/io
import gleam/list
import gleam/option
import gleam/result
import gleam/string
import gleam/uri.{type Uri}
import gluid
import lustre
import lustre/attribute
import lustre/effect
import lustre/element
import lustre/element/html
import lustre/event
import lustre_http
import modem.{initial_uri}
import rada/date as d

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
  ShowAddCategoryUI
  UserUpdatedCategoryName(cat_name: String)
  AddCategory
  AddCategoryResult(c: Result(Category, lustre_http.HttpError))
  AddTransaction
  UserUpdatedTransactionDate(date: String)
  UserUpdatedTransactionPayee(payee: String)
  UserUpdatedTransactionCategory(cat: String)
  UserUpdatedTransactionAmount(amount: String)
  AddTransactionResult(c: Result(Transaction, lustre_http.HttpError))
  EditTarget(c: Category)
  SaveTarget(c: Category)
  DeleteTarget(c: Category)
  UserTargetUpdateAmount(amount: String)
  EditTargetCadence(is_monthly: Bool)
  UserTargetUpdateCustomDate(date: String)
  CategorySaveTarget(a: Result(Category, lustre_http.HttpError))
  SelectTransaction(t: Transaction)
  EditTransaction(t: Transaction, category_name: String)
  UpdateTransaction
  DeleteTransaction(t_id: String)
  TransactionDeleteResult(a: Result(String, lustre_http.HttpError))
  TransactionEditResult(a: Result(Transaction, lustre_http.HttpError))
  UserTransactionEditPayee(p: String)
  UserTransactionEditDate(d: String)
  UserTransactionEditCategory(c: String)
  UserTransactionEditAmount(a: String)
  UserInputCategoryUpdateName(n: String)
  UpdateCategoryName(cat: Category)
  DeleteCategory
  CategoryDeleteResult(a: Result(String, lustre_http.HttpError))
  SaveAllocation(alloc_id: option.Option(String))
  SaveAllocationResult(Result(AllocationEffectResult, lustre_http.HttpError))
  UserAllocationUpdate(amount: String)
}

type Model {
  Model(
    user: User,
    cycle: Cycle,
    route: Route,
    categories: List(Category),
    transactions: List(Transaction),
    allocations: List(Allocation),
    selected_category: option.Option(SelectedCategory),
    show_add_category_ui: Bool,
    user_category_name_input: String,
    transaction_add_input: TransactionForm,
    target_edit: TargetEdit,
    selected_transaction: option.Option(String),
    transaction_edit_form: option.Option(TransactionEditForm),
  )
}

type SelectedCategory {
  SelectedCategory(id: String, input_name: String, allocation: String)
}

type TransactionForm {
  TransactionForm(
    date: String,
    payee: String,
    category: option.Option(Category),
    amount: option.Option(Money),
  )
}

type TransactionEditForm {
  TransactionEditForm(
    id: String,
    date: String,
    payee: String,
    category: String,
    amount: String,
  )
}

type TargetEdit {
  TargetEdit(cat_id: String, enabled: Bool, target: Target)
}

pub type Cycle {
  Cycle(year: Int, month: d.Month)
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
  Allocation(id: String, amount: Money, category_id: String, date: d.Month)
}

pub type Transaction {
  Transaction(
    id: String,
    date: d.Date,
    payee: String,
    category_id: String,
    value: Money,
  )
}

pub fn main() {
  // let today = d.from_calendar_date(2024, d.Nov, 1)
  // let feb = d.from_calendar_date(2024, d.Dec, 1)

  // let dates = date.range(date.Month, 1, today, feb)
  // io.debug(dates |> list.count(fn(d) { True }) |> int.to_string)
  // dates
  // |> list.each(fn(entry) { date.format(entry, "EEEE, d MMMM y") |> io.println })
  // io.debug(d.diff(d.Months, today, feb) |> int.to_string)
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
      Model(
        ..model,
        selected_category: option.Some(SelectedCategory(
          c.id,
          c.name,
          find_alloc_by_cat_id(c.id, model.cycle.month)
            |> result.map(fn(a) { a.amount |> money_to_string_no_sign })
            |> result.unwrap(""),
        )),
      ),
      effect.none(),
    )
    SelectUser(user) -> #(Model(..model, user: user), effect.none())
    ShowAddCategoryUI -> #(
      Model(..model, show_add_category_ui: !model.show_add_category_ui),
      effect.none(),
    )
    AddCategory -> #(
      Model(..model, user_category_name_input: ""),
      add_category(model.user_category_name_input),
    )
    UserUpdatedCategoryName(name) -> #(
      Model(..model, user_category_name_input: name),
      effect.none(),
    )
    AddCategoryResult(Ok(c)) -> #(
      Model(..model, categories: list.flatten([model.categories, [c]])),
      effect.none(),
    )
    AddCategoryResult(Error(_)) -> #(model, effect.none())
    AddTransaction -> #(
      Model(
        ..model,
        transaction_add_input: TransactionForm(
          date: "",
          payee: "",
          category: option.None,
          amount: option.None,
        ),
      ),
      add_transaction_eff(model.transaction_add_input),
    )
    AddTransactionResult(Ok(t)) -> #(
      Model(..model, transactions: list.flatten([model.transactions, [t]])),
      effect.none(),
    )
    AddTransactionResult(Error(_)) -> #(model, effect.none())
    UserUpdatedTransactionCategory(category_name) -> {
      #(
        Model(
          ..model,
          transaction_add_input: TransactionForm(
            ..model.transaction_add_input,
            category: model.categories
              |> list.find(fn(c) { c.name == category_name })
              |> option.from_result,
          ),
        ),
        effect.none(),
      )
    }
    UserUpdatedTransactionDate(date) -> #(
      Model(
        ..model,
        transaction_add_input: TransactionForm(
          ..model.transaction_add_input,
          date: date,
        ),
      ),
      effect.none(),
    )
    UserUpdatedTransactionPayee(payee) -> #(
      Model(
        ..model,
        transaction_add_input: TransactionForm(
          ..model.transaction_add_input,
          payee: payee,
        ),
      ),
      effect.none(),
    )
    UserUpdatedTransactionAmount(amount) -> #(
      Model(
        ..model,
        transaction_add_input: TransactionForm(
          ..model.transaction_add_input,
          amount: int.parse(amount)
            |> result.map(fn(amount) { Money(amount, 0) })
            |> option.from_result,
        ),
      ),
      effect.none(),
    )
    EditTarget(_) -> #(
      Model(
        ..model,
        target_edit: TargetEdit(..model.target_edit, enabled: True),
      ),
      effect.none(),
    )
    SaveTarget(c) -> {
      #(
        Model(
          ..model,
          target_edit: TargetEdit(..model.target_edit, enabled: False),
        ),
        save_target_eff(c, model.target_edit.target |> option.Some),
      )
    }
    DeleteTarget(c) -> #(
      Model(
        ..model,
        target_edit: TargetEdit(..model.target_edit, enabled: False),
      ),
      delete_target_eff(c),
    )
    UserTargetUpdateAmount(amount) -> {
      let amount = amount |> int.parse |> result.unwrap(0)
      let target = case model.target_edit.target {
        Custom(_, date) -> Custom(Money(amount, 0), date)
        Monthly(_) -> Monthly(Money(amount, 0))
      }
      #(
        Model(
          ..model,
          target_edit: TargetEdit(..model.target_edit, target: target),
        ),
        effect.none(),
      )
    }
    EditTargetCadence(is_monthly) -> {
      let target = case model.target_edit.target, is_monthly {
        Custom(money, _), True -> Monthly(money)
        Monthly(money), False -> Custom(money, date_to_month(d.today()))
        target, _ -> target
      }
      #(
        Model(
          ..model,
          target_edit: TargetEdit(..model.target_edit, target: target),
        ),
        effect.none(),
      )
    }
    UserTargetUpdateCustomDate(date) -> {
      let parsed_date =
        date_utils.from_date_string(date)
        |> result.lazy_unwrap(fn() { d.today() })
      let target = case model.target_edit.target {
        Custom(money, _) -> Custom(money, date_to_month(parsed_date))
        Monthly(money) -> Monthly(money)
      }
      #(
        Model(
          ..model,
          target_edit: TargetEdit(..model.target_edit, target: target),
        ),
        effect.none(),
      )
    }
    CategorySaveTarget(Ok(cat)) -> #(
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
    CategorySaveTarget(Error(_)) -> #(model, effect.none())
    SelectTransaction(t) -> #(
      Model(..model, selected_transaction: option.Some(t.id)),
      effect.none(),
    )
    DeleteTransaction(id) -> #(
      Model(..model, selected_transaction: option.None),
      delete_transaction_eff(id),
    )
    EditTransaction(t, category_name) -> #(
      Model(
        ..model,
        transaction_edit_form: option.Some(TransactionEditForm(
          id: t.id,
          date: t.date |> date_utils.to_date_string_input,
          payee: t.payee,
          category: category_name,
          amount: t.value |> money_to_string_no_sign,
        )),
      ),
      effect.none(),
    )
    TransactionDeleteResult(Ok(id)) -> #(
      Model(
        ..model,
        transactions: model.transactions |> list.filter(fn(t) { t.id != id }),
      ),
      effect.none(),
    )
    TransactionDeleteResult(Error(_)) -> #(model, effect.none())
    TransactionEditResult(Ok(transaction)) -> #(
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
    TransactionEditResult(Error(_)) -> #(model, effect.none())
    UserTransactionEditPayee(payee) -> #(
      Model(
        ..model,
        transaction_edit_form: model.transaction_edit_form
          |> option.map(fn(tef) { TransactionEditForm(..tef, payee: payee) }),
      ),
      effect.none(),
    )
    UserTransactionEditDate(d) -> #(
      Model(
        ..model,
        transaction_edit_form: model.transaction_edit_form
          |> option.map(fn(tef) { TransactionEditForm(..tef, date: d) }),
      ),
      effect.none(),
    )
    UserTransactionEditAmount(a) -> #(
      Model(
        ..model,
        transaction_edit_form: model.transaction_edit_form
          |> option.map(fn(tef) { TransactionEditForm(..tef, amount: a) }),
      ),
      effect.none(),
    )
    UserTransactionEditCategory(c) -> #(
      Model(
        ..model,
        transaction_edit_form: model.transaction_edit_form
          |> option.map(fn(tef) { TransactionEditForm(..tef, category: c) }),
      ),
      effect.none(),
    )
    UpdateTransaction -> #(
      Model(
        ..model,
        selected_transaction: option.None,
        transaction_edit_form: option.None,
      ),
      case model.transaction_edit_form {
        option.None -> effect.none()
        option.Some(tef) -> update_transaction_eff(tef, model.categories)
      },
    )
    DeleteCategory -> #(Model(..model, selected_category: option.None), case
      model.selected_category
    {
      option.None -> effect.none()
      option.Some(sc) -> delete_category_eff(sc.id)
    })
    UpdateCategoryName(cat) -> #(
      Model(..model, selected_category: option.None),
      case model.selected_category {
        option.Some(sc) ->
          save_target_eff(Category(..cat, name: sc.input_name), cat.target)
        option.None -> effect.none()
      },
    )
    UserInputCategoryUpdateName(name) -> #(
      Model(
        ..model,
        selected_category: model.selected_category
          |> option.map(fn(sc) { SelectedCategory(..sc, input_name: name) }),
      ),
      effect.none(),
    )
    CategoryDeleteResult(Ok(id)) -> #(
      Model(
        ..model,
        categories: model.categories
          |> list.filter(fn(c) { c.id != id }),
      ),
      effect.none(),
    )
    CategoryDeleteResult(Error(_)) -> #(model, effect.none())
    SaveAllocation(a) -> #(model, case model.selected_category {
      option.Some(sc) ->
        save_allocation_eff(a, sc.allocation, sc.id, model.cycle)
      option.None -> effect.none()
    })
    SaveAllocationResult(Ok(aer)) -> #(
      Model(
        ..model,
        allocations: case aer.is_created {
          True -> list.append(model.allocations, [aer.alloc])
          False ->
            model.allocations
            |> list.map(fn(a) {
              case a.id == aer.alloc.id {
                False -> a
                True -> aer.alloc
              }
            })
        },
      ),
      effect.none(),
    )
    SaveAllocationResult(Error(_)) -> #(model, effect.none())
    UserAllocationUpdate(a) -> #(
      Model(
        ..model,
        selected_category: model.selected_category
          |> option.map(fn(sc) { SelectedCategory(..sc, allocation: a) }),
      ),
      effect.none(),
    )
  }
}

type AllocationEffectResult {
  AllocationEffectResult(alloc: Allocation, is_created: Bool)
}

fn save_allocation_eff(
  alloc_id: option.Option(String),
  allocation: String,
  category_id: String,
  cycle: Cycle,
) -> effect.Effect(Msg) {
  let money = allocation |> string_to_money
  case alloc_id {
    option.Some(id) -> {
      let alloc = find_alloc_by_id(id)
      effect.from(fn(dispatch) {
        dispatch(case alloc {
          Ok(alloc_entity) ->
            SaveAllocationResult(
              Ok(AllocationEffectResult(
                Allocation(..alloc_entity, amount: money),
                False,
              )),
            )
          _ -> SaveAllocationResult(Error(lustre_http.NotFound))
        })
      })
    }
    option.None ->
      effect.from(fn(dispatch) {
        dispatch(
          SaveAllocationResult(
            Ok(AllocationEffectResult(
              Allocation(
                id: gluid.guidv4(),
                amount: money,
                category_id: category_id,
                date: cycle.month,
              ),
              True,
            )),
          ),
        )
      })
  }
}

fn find_alloc_by_id(id: String) -> Result(Allocation, Nil) {
  allocations() |> list.find(fn(a) { a.id == id })
}

fn find_alloc_by_cat_id(
  cat_id: String,
  month: d.Month,
) -> Result(Allocation, Nil) {
  allocations()
  |> list.find(fn(a) { a.category_id == cat_id && a.date == month })
}

fn delete_category_eff(c_id: String) -> effect.Effect(Msg) {
  effect.from(fn(dispatch) { dispatch(CategoryDeleteResult(Ok(c_id))) })
}

fn string_to_money(s: String) -> Money {
  case
    string.split(s, ".")
    |> list.map(fn(s) { int.parse(s) |> result.unwrap(0) })
  {
    [s, b, ..] -> Money(s, b)
    _ -> Money(0, 0)
  }
}

fn update_transaction_eff(
  tef: TransactionEditForm,
  categories: List(Category),
) -> effect.Effect(Msg) {
  let money = string_to_money(tef.amount)
  effect.from(fn(dispatch) {
    dispatch(
      TransactionEditResult(
        Ok(Transaction(
          id: tef.id,
          date: tef.date
            |> date_utils.from_date_string
            |> result.unwrap(d.today()),
          payee: tef.payee,
          category_id: categories
            |> list.find_map(fn(c) {
              case c.name == tef.category {
                True -> Ok(c.id)
                False -> Error("")
              }
            })
            |> result.unwrap(""),
          value: money,
        )),
      ),
    )
  })
}

fn delete_transaction_eff(t_id: String) -> effect.Effect(Msg) {
  effect.from(fn(dispatch) { dispatch(TransactionDeleteResult(Ok(t_id))) })
}

fn date_to_month(d: d.Date) -> MonthInYear {
  MonthInYear(d |> d.month_number, d |> d.year)
}

fn save_target_eff(
  category: Category,
  target_edit: option.Option(Target),
) -> effect.Effect(Msg) {
  effect.from(fn(dispatch) {
    dispatch(CategorySaveTarget(Ok(Category(..category, target: target_edit))))
  })
}

fn delete_target_eff(category: Category) -> effect.Effect(Msg) {
  effect.from(fn(dispatch) {
    dispatch(CategorySaveTarget(Ok(Category(..category, target: option.None))))
  })
}

fn init(_flags) -> #(Model, effect.Effect(Msg)) {
  #(
    Model(
      user: User(id: "id1", name: "Sergey"),
      cycle: Cycle(2024, d.Dec),
      route: Home,
      categories: [],
      transactions: [],
      allocations: [],
      selected_category: option.None,
      show_add_category_ui: False,
      user_category_name_input: "",
      transaction_add_input: TransactionForm("", "", option.None, option.None),
      target_edit: TargetEdit("", False, Monthly(Money(0, 0))),
      selected_transaction: option.None,
      transaction_edit_form: option.None,
    ),
    effect.batch([modem.init(on_route_change), initial_eff()]),
  )
}

fn on_route_change(uri: Uri) -> Msg {
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
    dispatch(Initial(User(id: "id2", name: "Sergey"), Cycle(2024, d.Dec), path))
  })
}

fn add_transaction_eff(transaction_form: TransactionForm) -> effect.Effect(Msg) {
  effect.from(fn(dispatch) {
    dispatch(case transaction_form.category, transaction_form.amount {
      option.Some(cat), option.Some(amount) ->
        AddTransactionResult(
          Ok(Transaction(
            id: gluid.guidv4(),
            // date: transaction_form.date,
            date: d.from_calendar_date(2024, d.Dec, 20),
            payee: transaction_form.payee,
            category_id: cat.id,
            value: amount,
          )),
        )
      _, _ ->
        AddTransactionResult(
          Error(lustre_http.InternalServerError("parse error")),
        )
    })
  })
}

fn add_category(name: String) -> effect.Effect(Msg) {
  effect.from(fn(dispatch) {
    dispatch(
      AddCategoryResult(
        Ok(Category(id: gluid.guidv4(), name: name, target: option.None)),
      ),
    )
  })
}

fn get_allocations() -> effect.Effect(Msg) {
  effect.from(fn(dispatch) { dispatch(Allocations(a: Ok(allocations()))) })
}

fn get_categories() -> effect.Effect(Msg) {
  effect.from(fn(dispatch) { dispatch(Categories(cats: Ok(categories()))) })
}

fn get_transactions() -> effect.Effect(Msg) {
  effect.from(fn(dispatch) { dispatch(Transactions(Ok(transactions()))) })
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
              element.text(ready_to_assign(
                model.transactions,
                model.allocations,
                model.cycle.month,
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
              html.text(model.user.name),
            ]),
          ],
        ),
      ]),
      html.div([attribute.class("d-flex flex-row")], [
        case model.route {
          Home -> {
            budget_categories(model)
          }
          TransactionsRoute -> budget_transactions(model)
          UserRoute -> user_selection(model)
        },
        html.div([], [
          {
            let selected_cat =
              model.selected_category
              |> option.map(fn(selected_cat) {
                model.categories
                |> list.find(fn(cat) { cat.id == selected_cat.id })
                |> option.from_result
              })
              |> option.flatten

            case selected_cat, model.route, model.selected_category {
              option.Some(c), Home, option.Some(sc) ->
                category_details(
                  c,
                  model,
                  sc,
                  model.allocations
                    |> list.find(fn(a) { a.id == c.id })
                    |> option.from_result,
                )
              _, _, _ -> html.text("")
            }
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
  model: Model,
  sc: SelectedCategory,
  allocation: option.Option(Allocation),
) -> element.Element(Msg) {
  html.div([attribute.class("col")], [
    html.div([], [
      html.input([
        event.on_input(UserInputCategoryUpdateName),
        attribute.placeholder("category name"),
        attribute.class("form-control"),
        attribute.type_("text"),
        attribute.style([#("width", "90px")]),
        attribute.value(sc.input_name),
      ]),
      html.button([event.on_click(UpdateCategoryName(category))], [
        element.text("Update"),
      ]),
      html.button([event.on_click(DeleteCategory)], [element.text("Delete")]),
    ]),
    html.div([attribute.class("row")], [
      html.div([attribute.class("col")], [
        html.div([], [html.text("Assigned")]),
        html.div([], [html.text(category_assigned(category, model.allocations))]),
      ]),
      html.div([attribute.class("col")], [
        html.div([], [html.text("Activity")]),
        html.div([], [
          html.text(category_activity(category, model.transactions)),
        ]),
      ]),
    ]),
    category_target_ui(category, model.target_edit),
    html.div([], [
      html.text("Allocated: "),
      html.input([
        event.on_input(UserAllocationUpdate),
        attribute.placeholder("amount"),
        attribute.class("form-control"),
        attribute.type_("text"),
        attribute.style([#("width", "120px")]),
        attribute.value(sc.allocation),
      ]),
      html.button(
        [
          event.on_click(SaveAllocation(
            alloc_id: allocation |> option.map(fn(a) { a.id }),
          )),
        ],
        [element.text("Save")],
      ),
    ]),
  ])
}

fn category_target_ui(c: Category, et: TargetEdit) -> element.Element(Msg) {
  case et.cat_id, et.enabled {
    _, True -> {
      html.div([attribute.class("col")], [
        html.div([], [
          html.text("Target"),
          html.button([event.on_click(SaveTarget(c))], [element.text("Save")]),
          html.button([event.on_click(DeleteTarget(c))], [
            element.text("Delete"),
          ]),
        ]),
        target_switcher_ui(et),
        case et.target {
          Custom(_, _) ->
            html.div([], [
              html.text("Amount needed for date: "),
              html.input([
                event.on_input(UserTargetUpdateAmount),
                attribute.placeholder("amount"),
                attribute.class("form-control"),
                attribute.type_("text"),
                attribute.style([#("width", "120px")]),
              ]),
              html.input([
                event.on_input(UserTargetUpdateCustomDate),
                attribute.placeholder("date"),
                attribute.class("form-control"),
                attribute.type_("date"),
              ]),
            ])
          Monthly(_) ->
            html.div([], [
              html.text("Amount monthly: "),
              html.input([
                event.on_input(UserTargetUpdateAmount),
                attribute.placeholder("amount"),
                attribute.class("form-control"),
                attribute.type_("text"),
                attribute.style([#("width", "120px")]),
                // attribute.value(money.b |> int.to_string),
              ]),
            ])
        },
      ])
    }
    _, _ -> {
      html.div([attribute.class("col")], [
        html.div([], [
          html.text("Target"),
          html.button([event.on_click(EditTarget(c))], [element.text("Edit")]),
        ]),
        html.div([], [html.text(target_string(c))]),
      ])
    }
  }
}

fn target_switcher_ui(et: TargetEdit) -> element.Element(Msg) {
  let #(monthly, custom) = case et.target {
    Custom(_, _) -> #("", "active")
    Monthly(_) -> #("active", "")
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
          event.on_click(EditTargetCadence(True)),
          attribute.class("btn btn-primary" <> monthly),
          attribute.type_("button"),
        ],
        [html.text("Monthly")],
      ),
      html.button(
        [
          event.on_click(EditTargetCadence(False)),
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
    option.Some(Custom(amount, date_till)) ->
      "Monthly: "
      <> custom_target_money_in_month(amount, date_till)
      <> "\n till date: "
      <> month_to_string(date_till)
      <> " Total amount: "
      <> money_to_string(amount)
    option.Some(Monthly(amount)) -> "Monthly: " <> money_to_string(amount)
  }
}

fn custom_target_money_in_month(m: Money, date: MonthInYear) -> String {
  let today = d.today()
  let final_date =
    d.from_calendar_date(date.year, d.number_to_month(date.month), 28)
  let months_count = d.diff(d.Months, today, final_date) + 1
  "€"
  <> m.s / months_count |> int.to_string
  <> "."
  <> m.b / months_count |> int.to_string
}

fn ready_to_assign(
  transactions: List(Transaction),
  allocations: List(Allocation),
  cur_mon: d.Month,
) -> String {
  let income =
    transactions
    |> list.filter(fn(t) { t.category_id == "0" })
    |> list.fold(Money(0, 0), fn(m, t) { money_sum(m, t.value) })
  let outcome =
    allocations
    |> list.filter_map(fn(a) {
      case a.date == cur_mon {
        True -> Ok(a.amount)
        False -> Error("")
      }
    })
    |> list.fold(Money(0, 0), fn(m, t) { money_sum(m, t) })

  money_minus(income, outcome) |> money_to_string_no_sign
}

fn budget_transactions(model: Model) -> element.Element(Msg) {
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
        list.map(model.transactions, fn(t) { transaction_list_item(t, model) }),
      ]),
    ),
  ])
}

fn transaction_list_item(t: Transaction, model: Model) -> element.Element(Msg) {
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
      html.tr([attribute.class(active_class)], [
        html.td([], [
          html.input([
            event.on_input(UserTransactionEditDate),
            attribute.placeholder("date"),
            attribute.value(tef.date),
            attribute.class("form-control"),
            attribute.type_("date"),
            attribute.style([#("width", "140px")]),
          ]),
        ]),
        html.td([], [
          html.input([
            event.on_input(UserTransactionEditPayee),
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
            event.on_input(UserTransactionEditCategory),
            attribute.placeholder("category"),
            attribute.value(tef.category),
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
            event.on_input(UserTransactionEditAmount),
            attribute.placeholder("amount"),
            attribute.value(tef.amount),
            attribute.class("form-control"),
            attribute.type_("text"),
            attribute.style([#("width", "160px")]),
          ]),
          manage_transaction_buttons(t, selected_id, category_name, True),
        ]),
      ])
    _, _ ->
      html.tr(
        [event.on_click(SelectTransaction(t)), attribute.class(active_class)],
        [
          html.td([], [html.text(date_utils.to_date_string(t.date))]),
          html.td([], [html.text(t.payee)]),
          html.td([], [html.text(category_name)]),
          html.td([], [
            html.text(transaction_amount(t)),
            manage_transaction_buttons(t, selected_id, category_name, False),
          ]),
        ],
      )
  }
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
            html.button([event.on_click(UpdateTransaction)], [
              element.text("Save"),
            ])
          False ->
            html.button([event.on_click(EditTransaction(t, category_name))], [
              element.text("Edit"),
            ])
        },
        html.button([event.on_click(DeleteTransaction(t.id))], [
          element.text("Delete"),
        ]),
      ])
  }
}

fn transaction_category_name(t: Transaction, cats: List(Category)) -> String {
  let category_name = case list.find(cats, fn(c) { c.id == t.category_id }) {
    Ok(c) -> c.name
    _ -> "not found"
  }
  category_name
}

fn transaction_amount(t: Transaction) -> String {
  t.value.s |> int.to_string <> "." <> t.value.b |> int.to_string
}

fn add_transaction_ui(
  transactions: List(Transaction),
  categories: List(Category),
) -> element.Element(Msg) {
  html.tr([], [
    html.td([], [
      html.input([
        event.on_input(UserUpdatedTransactionDate),
        attribute.placeholder("date"),
        attribute.id("addTransactionDateId"),
        attribute.class("form-control"),
        attribute.type_("date"),
      ]),
    ]),
    html.td([], [
      html.input([
        event.on_input(UserUpdatedTransactionPayee),
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
      html.input([
        event.on_input(UserUpdatedTransactionCategory),
        attribute.placeholder("category"),
        attribute.id("addTransactionCategoryId"),
        attribute.class("form-control"),
        attribute.type_("text"),
        attribute.attribute("list", "categories_list"),
      ]),
      html.datalist(
        [attribute.id("categories_list")],
        categories
          |> list.map(fn(c) { c.name })
          |> list.map(fn(p) { html.option([attribute.value(p)], "") }),
      ),
    ]),
    html.td([attribute.class("d-flex flex-row")], [
      html.input([
        event.on_input(UserUpdatedTransactionAmount),
        attribute.placeholder("amount"),
        attribute.id("addTransactionAmountId"),
        attribute.class("form-control"),
        attribute.type_("text"),
        attribute.style([#("width", "120px")]),
      ]),
      html.button([event.on_click(AddTransaction)], [element.text("Add")]),
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
            html.button([event.on_click(ShowAddCategoryUI)], [
              element.text(btn_label),
            ])
          },
        ]),
        html.th([], [html.text("Balance")]),
      ]),
    ]),
    html.tbody([], {
      let cats_ui =
        list.map(model.categories, fn(c) {
          let active_class = case model.selected_category {
            option.None -> ""
            option.Some(selected_cat) ->
              case selected_cat.id == c.id {
                True -> "table-active"
                False -> ""
              }
          }
          html.tr(
            [event.on_click(SelectCategory(c)), attribute.class(active_class)],
            [
              html.td([], [html.text(c.name)]),
              html.td([], [html.text(category_target(c))]),
            ],
          )
        })
      let add_cat_ui = case model.show_add_category_ui {
        False -> []
        True -> [
          html.tr([], [
            html.td([], [
              html.input([
                event.on_input(UserUpdatedCategoryName),
                attribute.placeholder("category name"),
                attribute.id("exampleFormControlInput1"),
                attribute.class("form-control"),
                attribute.type_("text"),
              ]),
            ]),
            html.td([], [
              html.button([event.on_click(AddCategory)], [element.text("Add")]),
            ]),
          ]),
        ]
      }

      list.flatten([add_cat_ui, cats_ui])
    }),
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
        Custom(money, date) -> custom_target_money_in_month(money, date)
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

fn money_minus(a: Money, b: Money) -> Money {
  let base_sum = a.b - b.b
  let #(euro, base) = case base_sum < 0 {
    True -> #(1, 100 + base_sum)
    False -> #(0, base_sum)
  }
  Money(a.s - b.s - euro, base)
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

//FACTORIES
fn allocations() -> List(Allocation) {
  [
    Allocation(id: "1", amount: Money(80, 0), category_id: "1", date: d.Dec),
    Allocation(id: "2", amount: Money(120, 0), category_id: "2", date: d.Dec),
    Allocation(id: "3", amount: Money(150, 0), category_id: "3", date: d.Dec),
    Allocation(id: "4", amount: Money(100, 2), category_id: "4", date: d.Dec),
    Allocation(id: "5", amount: Money(200, 2), category_id: "5", date: d.Dec),
    Allocation(id: "6", amount: Money(500, 2), category_id: "6", date: d.Dec),
  ]
}

fn categories() -> List(Category) {
  [
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
      target: option.Some(Custom(Money(150, 0), MonthInYear(2, 2025))),
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
  ]
}

fn transactions() -> List(Transaction) {
  [
    Transaction(
      id: "1",
      date: d.from_calendar_date(2024, d.Dec, 2),
      payee: "Amazon",
      category_id: "5",
      value: Money(-50, 0),
    ),
    Transaction(
      id: "2",
      date: d.from_calendar_date(2024, d.Dec, 2),
      payee: "Bauhaus",
      category_id: "5",
      value: Money(-50, 0),
    ),
    Transaction(
      id: "3",
      date: d.from_calendar_date(2024, d.Dec, 2),
      payee: "Rewe",
      category_id: "6",
      value: Money(-50, 0),
    ),
    Transaction(
      id: "4",
      date: d.from_calendar_date(2024, d.Dec, 2),
      payee: "Vodafone",
      category_id: "1",
      value: Money(-50, 0),
    ),
    Transaction(
      id: "5",
      date: d.from_calendar_date(2024, d.Dec, 2),
      payee: "Steam",
      category_id: "5",
      value: Money(-50, 0),
    ),
    Transaction(
      id: "6",
      date: d.from_calendar_date(2024, d.Dec, 2),
      payee: "Duo",
      category_id: "1",
      value: Money(-50, 60),
    ),
    Transaction(
      id: "7",
      date: d.from_calendar_date(2024, d.Dec, 2),
      payee: "O2",
      category_id: "1",
      value: Money(-50, 0),
    ),
    Transaction(
      id: "8",
      date: d.from_calendar_date(2024, d.Dec, 2),
      payee: "Trade Republic",
      category_id: "0",
      value: Money(1000, 0),
    ),
    Transaction(
      id: "8",
      date: d.from_calendar_date(2024, d.Dec, 2),
      payee: "O2",
      category_id: "1",
      value: Money(-100, 50),
    ),
  ]
}
