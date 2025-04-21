import budget_fe/internals/msg.{type Msg, type TransactionForm}
import budget_shared.{
  type Allocation, type Category, type Cycle, type Target,
  type User, Allocation, Category, Transaction,
} as m
import date_utils
import gleam/dynamic/decode
import gleam/http
import gleam/http/request
import gleam/json
import gleam/option.{None, Some}
import gleam/option.{type Option} as _
import gleam/result
import budget_fe/internals/uuid
import gleam/uri.{type Uri}
import lustre/effect
import lustre_http
import modem.{initial_uri}
import rada/date as d

const is_prod: Bool = True

fn root_url() -> String {
  case is_prod {
    True -> "https://budget-be.fly.dev/"
    False -> "http://localho.st:8080/"
  }
}

pub fn on_route_change(uri: Uri) -> Msg {
  let route = uri_to_route(uri)
  msg.OnRouteChange(route)
}

fn uri_to_route(uri: Uri) -> msg.Route {
  case uri.path_segments(uri.path) {
    ["transactions"] -> msg.TransactionsRoute
    ["user"] -> msg.UserRoute
    _ -> msg.Home
  }
}

pub fn initial_eff() -> effect.Effect(Msg) {
  let path = case initial_uri() {
    Ok(uri) -> uri_to_route(uri)
    _ -> msg.Home
  }

  let decoder = decode.list(m.user_decoder())
  lustre_http.get(
    root_url(),
    lustre_http.expect_json(decoder, fn(users) {
      msg.Initial(users, m.calculate_current_cycle(), path)
    }),
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
  current_user: User,
) -> effect.Effect(Msg) {
  let url = root_url() <> "transaction/add"

  let a =
    Transaction(
      id: uuid.guidv4(),
      date: transaction_form.date
        |> date_utils.from_date_string
        |> result.unwrap(d.today()),
      payee: transaction_form.payee,
      category_id: cat.id,
      value: amount,
      user_id: current_user.id,
    )
  // io.debug(t)
  lustre_http.post(
    url,
    m.transaction_encode(a),
    lustre_http.expect_json(m.transaction_decoder(), msg.AddTransactionResult),
  )
}

pub fn add_category(name: String, group_id: String) -> effect.Effect(Msg) {
  let url = root_url() <> "category/add"

  lustre_http.post(
    url,
    json.object([
      #("name", json.string(name)),
      #("group_id", json.string(group_id)),
    ]),
    lustre_http.expect_json(
      {
        use id <- decode.field("id", decode.string)
        decode.success(id)
      },
      msg.AddCategoryResult,
    ),
  )
}

pub fn get_allocations() -> effect.Effect(Msg) {
  let url = root_url() <> "allocations"

  let decoder = decode.list(m.allocation_decoder())
  lustre_http.get(url, lustre_http.expect_json(decoder, msg.Allocations))
}

pub fn get_categories() -> effect.Effect(Msg) {
  let url = root_url() <> "categories"

  let decoder = decode.list(m.category_decoder())
  lustre_http.get(url, lustre_http.expect_json(decoder, msg.Categories))
}

pub fn get_transactions() -> effect.Effect(Msg) {
  let url = root_url() <> "transactions"

  let decoder = decode.list(m.transaction_decoder())
  lustre_http.get(url, lustre_http.expect_json(decoder, msg.Transactions))
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
  let url = root_url() <> "category/groups"

  let decoder = decode.list(m.category_group_decoder())
  lustre_http.get(url, lustre_http.expect_json(decoder, msg.CategoryGroups))
}

pub fn add_new_group_eff(name: String) -> effect.Effect(Msg) {
  let url = root_url() <> "category/group/add"

  lustre_http.post(
    url,
    json.object([#("name", json.string(name))]),
    lustre_http.expect_json(
      {
        use id <- decode.field("id", decode.string)
        decode.success(id)
      },
      msg.AddCategoryGroupResult,
    ),
  )
}

fn create_allocation_eff(
  money: m.Money,
  category_id: String,
  cycle: Cycle,
) -> effect.Effect(Msg) {
  let url = root_url() <> "allocation/add"

  // io.debug(t)
  lustre_http.post(
    url,
    m.allocation_form_encode(m.AllocationForm(
      option.None,
      money,
      category_id,
      cycle,
    )),
    lustre_http.expect_json(m.id_decoder(), msg.SaveAllocationResult),
  )
}

fn update_allocation_eff(a: Allocation, amount: m.Money) -> effect.Effect(Msg) {
  let url = root_url() <> "allocation/" <> a.id

  let req =
    request.to(url)
    |> result.map(fn(req) { request.Request(..req, method: http.Put) })
  case req {
    Ok(req) ->
      lustre_http.send(
        req
          |> request.set_body(
            json.to_string(
              m.allocation_encode(Allocation(
                a.id,
                amount,
                a.category_id,
                a.date,
              )),
            ),
          )
          |> request.set_header("Content-Type", "application/json"),
        lustre_http.expect_json(m.id_decoder(), msg.SaveAllocationResult),
      )
    _ -> effect.none()
  }
}

pub fn delete_category_eff(c_id: String) -> effect.Effect(Msg) {
  let url = root_url() <> "category/" <> c_id

  let req =
    request.to(url)
    |> result.map(fn(req) { request.Request(..req, method: http.Delete) })
  case req {
    Ok(req) ->
      lustre_http.send(
        req,
        lustre_http.expect_json(m.id_decoder(), msg.CategoryDeleteResult),
      )
    _ -> effect.none()
  }
}

pub fn update_transaction_eff(t: m.Transaction) -> effect.Effect(Msg) {
  let url = root_url() <> "transaction/" <> t.id

  let req =
    request.to(url)
    |> result.map(fn(req) { request.Request(..req, method: http.Put) })
  case req {
    Ok(req) ->
      lustre_http.send(
        req
          |> request.set_body(json.to_string(m.transaction_encode(t)))
          |> request.set_header("Content-Type", "application/json"),
        lustre_http.expect_json(m.id_decoder(), msg.TransactionEditResult),
      )
    _ -> effect.none()
  }
}

pub fn delete_transaction_eff(t_id: String) -> effect.Effect(Msg) {
  let url = root_url() <> "transaction/" <> t_id

  let req =
    request.to(url)
    |> result.map(fn(req) { request.Request(..req, method: http.Delete) })
  case req {
    Ok(req) ->
      lustre_http.send(
        req,
        lustre_http.expect_json(m.id_decoder(), msg.TransactionDeleteResult),
      )
    _ -> effect.none()
  }
}

pub fn save_target_eff(
  category: Category,
  target_edit: Option(Target),
) -> effect.Effect(Msg) {
  let url = root_url() <> "category/" <> category.id
  let req =
    request.to(url)
    |> result.map(fn(req) { request.Request(..req, method: http.Put) })
  case req {
    Ok(req) ->
      lustre_http.send(
        req
          |> request.set_body(
            json.to_string(m.category_encode(
              Category(..category, target: target_edit),
            )),
          )
          |> request.set_header("Content-Type", "application/json"),
        lustre_http.expect_json(m.id_decoder(), msg.CategorySaveTarget),
      )
    _ -> effect.none()
  }
}

pub fn delete_target_eff(category: Category) -> effect.Effect(Msg) {
  let url = root_url() <> "category/target/" <> category.id

  let req =
    request.to(url)
    |> result.map(fn(req) { request.Request(..req, method: http.Put) })
  case req {
    Ok(req) ->
      lustre_http.send(
        req,
        lustre_http.expect_json(m.id_decoder(), msg.CategorySaveTarget),
      )
    _ -> effect.none()
  }
}

pub fn read_localstorage(key: String) -> effect.Effect(Msg) {
  effect.from(fn(dispatch) {
    do_read_localstorage(key)
    |> msg.CurrentSavedUser
    |> dispatch
  })
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
  let url = root_url() <> "category/suggestions"

  let decoder = m.category_suggestions_decoder()
  lustre_http.get(url, lustre_http.expect_json(decoder, msg.Suggestions))
}
