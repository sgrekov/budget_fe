import budget_test.{
  type Category, type Cycle, type Money, type MonthInYear, Category, Cycle,
  Money, MonthInYear,
} as m
import gleam/dynamic/decode
import gleam/json
import gleam/option.{type Option} as _
import rada/date as d

pub fn transaction_encode(t: m.Transaction) -> json.Json {
  json.object([
    #("id", json.string(t.id)),
    #("date", d.to_rata_die(t.date) |> json.int),
    #("payee", json.string(t.payee)),
    #("category_id", json.string(t.category_id)),
    #("value", money_encode(t.value)),
    #("user_id", json.string(t.user_id)),
  ])
}

pub fn money_encode(money: Money) -> json.Json {
  json.object([
    #("money_value", json.int(money.value)),
  ])
}

pub fn id_decoder() -> decode.Decoder(String) {
  {
    use id <- decode.field("id", decode.string)
    decode.success(id)
  }
}

pub fn allocation_encode(
  id: Option(String),
  amount: Money,
  cat_id: String,
  cycle: Cycle,
) -> json.Json {
  json.object([
    #("id", json.nullable(id, of: json.string)),
    #("amount", money_encode(amount)),
    #("category_id", json.string(cat_id)),
    #("date", cycle_encode(cycle)),
  ])
}

pub fn cycle_encode(cycle: Cycle) -> json.Json {
  json.object([
    #("year", json.int(cycle.year)),
    #("month", cycle.month |> d.month_to_number |> json.int),
  ])
}

pub fn category_encode(cat: Category) -> json.Json {
  json.object([
    #("id", json.string(cat.id)),
    #("name", json.string(cat.name)),
    #("target", json.nullable(cat.target, of: target_encode)),
    #("inflow", json.bool(cat.inflow)),
    #("group_id", json.string(cat.group_id)),
  ])
}

pub fn target_encode(target: m.Target) -> json.Json {
  case target {
    m.Monthly(money) ->
      json.object([
        #("type", json.string("monthly")),
        #("money", money_encode(money)),
      ])
    m.Custom(money, month) ->
      json.object([
        #("type", json.string("custom")),
        #("money", money_encode(money)),
        #("date", month_in_year_encode(month)),
      ])
  }
}

pub fn month_in_year_encode(month: MonthInYear) -> json.Json {
  json.object([
    #("month", json.int(month.month)),
    #("year", json.int(month.year)),
  ])
}
