import budget_fe/internals/factories.{allocations, transactions}
import budget_fe/internals/msg.{type Msg, type TransactionForm}
import budget_test.{
  type Allocation, type Category, type Cycle, type Money, type MonthInYear,
  type Target, type Transaction, type User, Allocation, Category, Cycle, Money,
  MonthInYear, Transaction, User,
} as m
import date_utils
import decode/zero
import gleam/dynamic
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
  let month_decoder = {
    use month <- zero.field("month", zero.int)
    use year <- zero.field("year", zero.int)
    zero.success(m.MonthInYear(month, year))
  }
  month_decoder
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
