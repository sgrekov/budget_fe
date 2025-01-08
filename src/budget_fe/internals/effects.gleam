import budget_fe/internals/decoders
import budget_fe/internals/msg.{type Msg, type TransactionForm}
import budget_test.{
  type Allocation, type Category, type Cycle, type Target, type Transaction,
  type User, Allocation, Category, Cycle, Transaction, User,
} as m
import date_utils
import decode/zero
import gleam/http
import gleam/http/request
import gleam/io
import gleam/json
import gleam/list
import gleam/option.{None, Some}
import gleam/option.{type Option} as _
import gleam/result
import gleam/uri.{type Uri}
import gluid
import lustre/effect
import lustre_http
import modem.{initial_uri}
import rada/date as d

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
  effect.from(fn(dispatch) {
    dispatch(msg.Initial(
      User(id: "id2", name: "Sergey"),
      m.calculate_current_cycle(),
      path,
    ))
  })
}

pub fn add_transaction_eff(
  transaction_form: TransactionForm,
  amount: m.Money,
  cat: Category,
) -> effect.Effect(Msg) {
  let url = "http://localhost:8000/transaction/add"

  let t =
    Transaction(
      id: gluid.guidv4(),
      date: transaction_form.date
        |> date_utils.from_date_string
        |> result.unwrap(d.today()),
      payee: transaction_form.payee,
      category_id: cat.id,
      value: amount,
    )
  // io.debug(t)
  lustre_http.post(
    url,
    decoders.transaction_encode(t),
    lustre_http.expect_json(
      fn(d) { zero.run(d, decoders.transaction_decoder()) },
      msg.AddTransactionResult,
    ),
  )
}

pub fn add_category(name: String) -> effect.Effect(Msg) {
  let url = "http://localhost:8000/category/add"

  lustre_http.post(
    url,
    json.object([#("name", json.string(name))]),
    lustre_http.expect_json(
      fn(d) {
        zero.run(d, {
          use id <- zero.field("id", zero.string)
          zero.success(id)
        })
      },
      msg.AddCategoryResult,
    ),
  )
}

pub fn get_allocations(cycle: Cycle) -> effect.Effect(Msg) {
  let url = "http://localho.st:8000/allocations"

  let decoder = zero.list(decoders.allocation_decoder())
  lustre_http.get(
    url,
    lustre_http.expect_json(fn(d) { zero.run(d, decoder) }, msg.Allocations),
  )
}

pub fn get_categories() -> effect.Effect(Msg) {
  let url = "http://localho.st:8000/categories"

  let decoder = zero.list(decoders.category_decoder())
  lustre_http.get(
    url,
    lustre_http.expect_json(fn(d) { zero.run(d, decoder) }, msg.Categories),
  )
}

pub fn get_transactions() -> effect.Effect(Msg) {
  let url = "http://localho.st:8000/transactions"

  let decoder = zero.list(decoders.transaction_decoder())
  lustre_http.get(
    url,
    lustre_http.expect_json(fn(d) { zero.run(d, decoder) }, msg.Transactions),
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

fn create_allocation_eff(
  money: m.Money,
  category_id: String,
  cycle: Cycle,
) -> effect.Effect(Msg) {
  let url = "http://localhost:8000/allocation/add"

  // io.debug(t)
  lustre_http.post(
    url,
    decoders.allocation_encode(None, money, category_id, cycle),
    lustre_http.expect_json(
      fn(d) { zero.run(d, decoders.id_decoder()) },
      msg.SaveAllocationResult,
    ),
  )
}

fn update_allocation_eff(a: Allocation, amount: m.Money) -> effect.Effect(Msg) {
  let url = "http://localho.st:8000/allocation/" <> a.id

  let req =
    request.to(url)
    |> result.map(fn(req) { request.Request(..req, method: http.Put) })
  case req {
    Ok(req) ->
      lustre_http.send(
        req
          |> request.set_body(
            json.to_string(decoders.allocation_encode(
              option.Some(a.id),
              amount,
              a.category_id,
              a.date,
            )),
          ) |> request.set_header("Content-Type", "application/json"),
        lustre_http.expect_json(
          fn(d) { zero.run(d, decoders.id_decoder()) },
          msg.SaveAllocationResult,
        ),
      )
    _ -> effect.none()
  }
}

pub fn delete_category_eff(c_id: String) -> effect.Effect(Msg) {
  let url = "http://localho.st:8000/category/" <> c_id

  let req =
    request.to(url)
    |> result.map(fn(req) { request.Request(..req, method: http.Delete) })
  case req {
    Ok(req) ->
      lustre_http.send(
        req,
        lustre_http.expect_json(
          fn(d) { zero.run(d, decoders.id_decoder()) },
          msg.CategoryDeleteResult,
        ),
      )
    _ -> effect.none()
  }
}

pub fn update_transaction_eff(t: m.Transaction) -> effect.Effect(Msg) {
  let url = "http://localho.st:8000/transaction/" <> t.id

  let req =
    request.to(url)
    |> result.map(fn(req) { request.Request(..req, method: http.Put) })
  case req {
    Ok(req) ->
      lustre_http.send(
        req
          |> request.set_body(json.to_string(decoders.transaction_encode(t)))
          |> request.set_header("Content-Type", "application/json"),
        lustre_http.expect_json(
          fn(d) { zero.run(d, decoders.id_decoder()) },
          msg.TransactionEditResult,
        ),
      )
    _ -> effect.none()
  }
}

pub fn delete_transaction_eff(t_id: String) -> effect.Effect(Msg) {
  let url = "http://localho.st:8000/transaction/" <> t_id

  let req =
    request.to(url)
    |> result.map(fn(req) { request.Request(..req, method: http.Delete) })
  case req {
    Ok(req) ->
      lustre_http.send(
        req,
        lustre_http.expect_json(
          fn(d) { zero.run(d, decoders.id_decoder()) },
          msg.TransactionDeleteResult,
        ),
      )
    _ -> effect.none()
  }
}

pub fn save_target_eff(
  category: Category,
  target_edit: Option(Target),
) -> effect.Effect(Msg) {  
  let url = "http://localho.st:8000/category/" <> category.id

  let req =
    request.to(url)
    |> result.map(fn(req) { request.Request(..req, method: http.Put) })
  case req {
    Ok(req) ->
      lustre_http.send(
        req
          |> request.set_body(
            json.to_string(decoders.category_encode(
              Category(..category, target: target_edit),
            )),
          )
          |> request.set_header("Content-Type", "application/json"),
        lustre_http.expect_json(
          fn(d) { zero.run(d, decoders.id_decoder()) },
          msg.CategorySaveTarget,
        ),
      )
    _ -> effect.none()
  }
}

pub fn delete_target_eff(category: Category) -> effect.Effect(Msg) {
  let url = "http://localho.st:8000/category/target/" <> category.id

  let req =
    request.to(url)
    |> result.map(fn(req) { request.Request(..req, method: http.Put) })
  case req {
    Ok(req) ->
      lustre_http.send(
        req,
        lustre_http.expect_json(
          fn(d) { zero.run(d, decoders.id_decoder()) },
          msg.CategorySaveTarget,
        ),
      )
    _ -> effect.none()
  }
}
