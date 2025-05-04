import budget_fe/internals/msg.{type Msg, type TransactionForm}
import budget_fe/internals/uuid
import budget_shared.{
  type Allocation, type Category, type Cycle, Allocation, Category, Transaction,
} as m
import date_utils as budget_shared
import gleam/dynamic/decode
import gleam/http
import gleam/http/request
import gleam/json
import gleam/option.{None, Some}
import gleam/option.{type Option} as _
import gleam/result
import gleam/uri.{type Uri}
import lustre/effect
import lustre_http
import rada/date as d

const is_prod: Bool = True

pub fn on_route_change(uri: Uri) -> Msg {
  let route = uri_to_route(uri)
  msg.OnRouteChange(route)
}

fn uri_to_route(uri: Uri) -> msg.Route {
  case uri.path_segments(uri.path) {
    ["transactions"] -> msg.TransactionsRoute
    // ["user"] -> msg.UserRoute
    _ -> msg.Home
  }
}

fn request_with_auth() -> request.Request(String) {
  let jwt = do_read_localstorage("jwt") |> echo |> result.unwrap("")
  let req = case is_prod {
    True ->
      request.new()
      |> request.set_host("budget-be.fly.dev")
      |> request.set_port(443)
      |> request.set_scheme(http.Https)
    False ->
      request.new()
      |> request.set_host("127.0.0.1")
      |> request.set_port(8080)
      |> request.set_scheme(http.Http)
  }

  req
  |> request.set_method(http.Get)
  |> request.set_header("Content-Type", "application/json")
  |> request.set_header("Accept", "application/json")
  |> request.set_header("Authorization", "Bearer " <> jwt)
}

pub fn load_user_eff() -> effect.Effect(Msg) {
  make_request(
    http.Get,
    "user",
    option.None,
    m.user_with_token_decoder(),
    fn(user_with_token) {
      msg.LoginResult(user_with_token, m.calculate_current_cycle())
    },
  )
}

//dev func for easier working with right panel
pub fn select_category_eff() -> effect.Effect(Msg) {
  effect.from(fn(dispatch) {
    msg.SelectCategory(m.Category(
      id: "f254cdd0-003d-48c3-8eed-77e86c99fcc0",
      name: "Shopping2",
      target: Some(m.Monthly(target: m.Money(value: 4000))),
      inflow: False,
      group_id: "bcd5d6e1-dd6e-44fd-8dd6-4dea104a8e0a",
    ))
    |> dispatch
  })
}

pub fn add_transaction_eff(
  transaction_form: TransactionForm,
  amount: m.Money,
  cat: Category,
  // current_user: User,
) -> effect.Effect(Msg) {
  let t =
    Transaction(
      id: uuid.guidv4(),
      date: transaction_form.date
        |> budget_shared.from_date_string
        |> result.unwrap(d.today()),
      payee: transaction_form.payee,
      category_id: cat.id,
      value: amount,
      user_id: "",
    )

  make_post(
    "transaction/add",
    json.to_string(m.transaction_encode(t)),
    m.transaction_decoder(),
    msg.AddTransactionResult,
  )
}

pub fn add_category(name: String, group_id: String) -> effect.Effect(Msg) {
  make_post(
    "category/add",
    json.to_string(
      json.object([
        #("name", json.string(name)),
        #("group_id", json.string(group_id)),
      ]),
    ),
    m.id_decoder(),
    msg.AddCategoryResult,
  )
}

fn make_post(
  path: String,
  json: String,
  decoder: decode.Decoder(a),
  to_msg: fn(Result(a, lustre_http.HttpError)) -> Msg,
) -> effect.Effect(Msg) {
  make_request(http.Post, path, option.Some(json), decoder, to_msg)
}

fn make_request(
  method: http.Method,
  path: String,
  json: Option(String),
  decoder: decode.Decoder(a),
  to_msg: fn(Result(a, lustre_http.HttpError)) -> Msg,
) -> effect.Effect(Msg) {
  let req =
    request_with_auth()
    |> request.set_method(method)
    |> request.set_path(path)

  let req_with_body = case json {
    Some(json) -> req |> request.set_body(json)
    None -> req
  }

  lustre_http.send(req_with_body, lustre_http.expect_json(decoder, to_msg))
}

pub fn get_allocations() -> effect.Effect(Msg) {
  let path = "allocations"

  let decoder = decode.list(m.allocation_decoder())
  lustre_http.send(
    request_with_auth() |> request.set_path(path),
    lustre_http.expect_json(decoder, msg.Allocations),
  )
}

pub fn get_categories() -> effect.Effect(Msg) {
  let path = "categories"

  let decoder = decode.list(m.category_decoder())
  lustre_http.send(
    request_with_auth() |> request.set_path(path),
    lustre_http.expect_json(decoder, msg.Categories),
  )
}

pub fn get_transactions() -> effect.Effect(Msg) {
  let path = "transactions"

  let decoder = decode.list(m.transaction_decoder())
  lustre_http.send(
    request_with_auth() |> request.set_path(path),
    lustre_http.expect_json(decoder, msg.Transactions),
  )
}

pub fn save_allocation_eff(
  alloc: Option(Allocation),
  money: m.Money,
  category_id: String,
  cycle: Cycle,
) -> effect.Effect(Msg) {
  case alloc {
    Some(allocation) -> update_allocation_eff(allocation, money)
    None -> create_allocation_eff(money, category_id, cycle)
  }
}

pub fn get_category_groups() -> effect.Effect(Msg) {
  let path = "category/groups"

  let decoder = decode.list(m.category_group_decoder())
  lustre_http.send(
    request_with_auth() |> request.set_path(path),
    lustre_http.expect_json(decoder, msg.CategoryGroups),
  )
}

pub fn add_new_group_eff(name: String) -> effect.Effect(Msg) {
  make_post(
    "category/group/add",
    json.to_string(json.object([#("name", json.string(name))])),
    m.id_decoder(),
    msg.AddCategoryGroupResult,
  )
}

pub fn update_group_eff(group: m.CategoryGroup) -> effect.Effect(Msg) {
  make_request(
    http.Put,
    "category/group",
    json.to_string(m.category_group_encode(group))
      |> option.Some,
    m.id_decoder(),
    msg.AddCategoryGroupResult,
  )
}

fn create_allocation_eff(
  money: m.Money,
  category_id: String,
  cycle: Cycle,
) -> effect.Effect(Msg) {
  make_post(
    "allocation/add",
    json.to_string(
      m.allocation_form_encode(m.AllocationForm(
        option.None,
        money,
        category_id,
        cycle,
      )),
    ),
    m.id_decoder(),
    msg.SaveAllocationResult,
  )
}

fn update_allocation_eff(a: Allocation, amount: m.Money) -> effect.Effect(Msg) {
  make_request(
    http.Put,
    "allocation/" <> a.id,
    json.to_string(
      m.allocation_encode(Allocation(a.id, amount, a.category_id, a.date)),
    )
      |> option.Some,
    m.id_decoder(),
    msg.SaveAllocationResult,
  )
}

pub fn delete_category_eff(c_id: String) -> effect.Effect(Msg) {
  make_request(
    http.Delete,
    "category/" <> c_id,
    option.None,
    m.id_decoder(),
    msg.CategoryDeleteResult,
  )
}

pub fn update_transaction_eff(t: m.Transaction) -> effect.Effect(Msg) {
  make_request(
    http.Put,
    "transaction/" <> t.id,
    json.to_string(m.transaction_encode(t)) |> option.Some,
    m.id_decoder(),
    msg.TransactionEditResult,
  )
}

pub fn delete_transaction_eff(t_id: String) -> effect.Effect(Msg) {
  make_request(
    http.Delete,
    "transaction/" <> t_id,
    option.None,
    m.id_decoder(),
    msg.TransactionDeleteResult,
  )
}

pub fn update_category_target_eff(
  category: Category,
  target_edit: Option(msg.TargetEditForm),
) -> effect.Effect(Msg) {
  let target =
    target_edit
    |> option.map(fn(target_edit_form) {
      case target_edit_form.is_custom {
        True ->
          m.Custom(
            target: target_edit_form.target_amount |> m.string_to_money,
            date: target_edit_form.target_custom_date
              |> option.map(fn(str) { budget_shared.date_string_to_month(str) })
              |> option.unwrap(m.MonthInYear(0, 0)),
          )
        False ->
          m.Monthly(target: target_edit_form.target_amount |> m.string_to_money)
      }
    })

  make_request(
    http.Put,
    "category/" <> category.id,
    json.to_string(m.category_encode(Category(..category, target: target)))
      |> option.Some,
    m.id_decoder(),
    msg.CategorySaveTarget,
  )
}

pub fn update_category_eff(category: Category) -> effect.Effect(Msg) {
  make_request(
    http.Put,
    "category/" <> category.id,
    json.to_string(m.category_encode(category))
      |> option.Some,
    m.id_decoder(),
    msg.CategorySaveTarget,
  )
}

pub fn delete_target_eff(category: Category) -> effect.Effect(Msg) {
  make_request(
    http.Delete,
    "category/target/" <> category.id,
    option.None,
    m.id_decoder(),
    msg.CategorySaveTarget,
  )
}

pub fn login_eff(login: String, pass: String) -> effect.Effect(Msg) {
  make_post(
    "login",
    json.to_string(
      json.object([#("login", json.string(login)), #("pass", json.string(pass))]),
    ),
    m.user_with_token_decoder(),
    fn(user_with_token) {
      msg.LoginResult(user_with_token, m.calculate_current_cycle())
    },
  )
}

@external(javascript, "./app.ffi.mjs", "read_localstorage")
fn do_read_localstorage(_key: String) -> Result(String, Nil) {
  Error(Nil)
}

pub fn write_localstorage(key: String, value: String) -> effect.Effect(msg) {
  effect.from(fn(_) { do_write_localstorage(key, value) })
}

@external(javascript, "./app.ffi.mjs", "write_localstorage")
fn do_write_localstorage(_key: String, _value: String) -> Nil {
  Nil
}

pub fn get_category_suggestions() -> effect.Effect(Msg) {
  let path = "category/suggestions"

  let decoder = m.category_suggestions_decoder()
  lustre_http.send(
    request_with_auth()
      |> request.set_path(path),
    lustre_http.expect_json(decoder, msg.Suggestions),
  )
}
