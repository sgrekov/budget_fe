import budget_fe/internals/msg.{type Msg, type TransactionForm}
import budget_test.{
  type Allocation, type Category, type Cycle, type Money, type MonthInYear,
  type Target, type Transaction, type User, Allocation, Category, Cycle, Money,
  MonthInYear, Transaction, User,
} as m
import date_utils
import decode/zero
import gleam/dynamic
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

pub fn money_decoder() -> zero.Decoder(Money) {
  let money_decoder = {
    use s <- zero.field("s", zero.int)
    use b <- zero.field("b", zero.int)
    use inflow <- zero.field("inflow", zero.bool)
    zero.success(m.Money(s, b, inflow))
  }
  money_decoder
}

pub fn month_decoder() -> zero.Decoder(MonthInYear) {
  {
    use month <- zero.field("month", zero.int)
    use year <- zero.field("year", zero.int)
    zero.success(m.MonthInYear(month, year))
  }
}

pub fn target_decoder() -> zero.Decoder(Target) {
  let monthly_decoder = {
    use money <- zero.field("money", money_decoder())
    zero.success(m.Monthly(money))
  }

  let custom_decoder = {
    use money <- zero.field("money", money_decoder())
    use date <- zero.field("date", month_decoder())
    zero.success(m.Custom(money, date))
  }

  let target_decoder = {
    use tag <- zero.field("type", zero.string)
    case tag {
      "monthly" -> monthly_decoder
      _ -> custom_decoder
    }
  }
  target_decoder
}

pub fn category_decoder() -> zero.Decoder(Category) {
  let category_decoder = {
    use id <- zero.field("id", zero.string)
    use name <- zero.field("name", zero.string)
    use target <- zero.field("target", zero.optional(target_decoder()))
    use inflow <- zero.field("inflow", zero.bool)
    zero.success(Category(id, name, target, inflow))
  }
}

pub fn transaction_decoder() -> zero.Decoder(Transaction) {
  let transaction_decoder = {
    use id <- zero.field("id", zero.string)
    use date <- zero.field("date", zero.int)
    use payee <- zero.field("payee", zero.string)
    use category_id <- zero.field("category_id", zero.string)
    use value <- zero.field("value", money_decoder())
    zero.success(Transaction(
      id,
      d.from_rata_die(date),
      payee,
      category_id,
      value,
    ))
  }
  transaction_decoder
}

pub fn transaction_encode(t: m.Transaction) -> json.Json {
  json.object([
    #("id", json.string(t.id)),
    #("date", d.to_rata_die(t.date) |> json.int),
    #("payee", json.string(t.payee)),
    #("category_id", json.string(t.category_id)),
    #("value", money_encode(t.value)),
  ])
}

pub fn money_encode(money: Money) -> json.Json {
  json.object([
    #("s", json.int(money.s)),
    #("b", json.int(money.b)),
    #("inflow", json.bool(money.is_neg)),
  ])
}

pub fn cycle_decoder() -> zero.Decoder(Cycle) {
  let cycle_decoder = {
    use month <- zero.field("month", zero.int)
    use year <- zero.field("year", zero.int)
    zero.success(m.Cycle(year, month |> d.number_to_month))
  }
  cycle_decoder
}

pub fn id_decoder() -> zero.Decoder(String) {
  {
    use id <- zero.field("id", zero.string)
    zero.success(id)
  }
}

pub fn allocation_decoder() -> zero.Decoder(Allocation) {
  let allocation_decoder = {
    use id <- zero.field("id", zero.string)
    use amount <- zero.field("amount", money_decoder())
    use category_id <- zero.field("category_id", zero.string)
    use date <- zero.field("date", cycle_decoder())
    zero.success(Allocation(id, amount, category_id, date))
  }
  allocation_decoder
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
