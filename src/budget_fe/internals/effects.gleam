import budget_fe/internals/factories.{allocations}
import budget_test.{
  type Allocation, type Category, type Cycle, type Target, type Transaction,
} as m

import budget_test.{Allocation, Category, Cycle, Transaction}

import budget_fe/internals/msg.{type Msg}
import date_utils
import gleam/list
import gleam/option.{None, Some}
import gleam/option.{type Option} as _
import gleam/result
import gluid
import lustre/effect
import lustre_http
import rada/date as d

pub fn save_allocation_eff(
  alloc_id: Option(String),
  allocation: String,
  category_id: String,
  cycle: Cycle,
) -> effect.Effect(Msg) {
  let money = allocation |> m.string_to_money
  case alloc_id {
    Some(id) -> {
      let alloc = find_alloc_by_id(id, cycle)
      effect.from(fn(dispatch) {
        dispatch(case alloc {
          Ok(alloc_entity) ->
            msg.SaveAllocationResult(
              Ok(msg.AllocationEffectResult(
                Allocation(..alloc_entity, amount: money),
                False,
              )),
            )
          _ -> msg.SaveAllocationResult(Error(lustre_http.NotFound))
        })
      })
    }
    None ->
      effect.from(fn(dispatch) {
        dispatch(
          msg.SaveAllocationResult(
            Ok(msg.AllocationEffectResult(
              Allocation(
                id: gluid.guidv4(),
                amount: money,
                category_id: category_id,
                date: cycle,
              ),
              True,
            )),
          ),
        )
      })
  }
}

fn find_alloc_by_id(id: String, cycle: Cycle) -> Result(Allocation, Nil) {
  allocations(cycle) |> list.find(fn(a) { a.id == id })
}

pub fn delete_category_eff(c_id: String) -> effect.Effect(Msg) {
  effect.from(fn(dispatch) { dispatch(msg.CategoryDeleteResult(Ok(c_id))) })
}

pub fn update_transaction_eff(
  tef: msg.TransactionEditForm,
  categories: List(Category),
) -> effect.Effect(Msg) {
  let money = m.string_to_money(tef.amount)
  effect.from(fn(dispatch) {
    dispatch(
      msg.TransactionEditResult(
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

pub fn delete_transaction_eff(t_id: String) -> effect.Effect(Msg) {
  effect.from(fn(dispatch) { dispatch(msg.TransactionDeleteResult(Ok(t_id))) })
}

pub fn save_target_eff(
  category: Category,
  target_edit: Option(Target),
) -> effect.Effect(Msg) {
  effect.from(fn(dispatch) {
    dispatch(
      msg.CategorySaveTarget(Ok(Category(..category, target: target_edit))),
    )
  })
}

pub fn delete_target_eff(category: Category) -> effect.Effect(Msg) {
  effect.from(fn(dispatch) {
    dispatch(msg.CategorySaveTarget(Ok(Category(..category, target: None))))
  })
}
