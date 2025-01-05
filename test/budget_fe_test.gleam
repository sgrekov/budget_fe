import budget_test.{
  type Allocation, type Category, type Cycle, type MonthInYear, type Transaction,
  type User, Allocation, Category, Cycle, MonthInYear, Transaction, User,
} as m
import gleeunit
import gleeunit/should

pub fn main() {
  gleeunit.main()
}

// gleeunit test functions end in `_test`
pub fn money_sum_test() {
  m.money_sum(m.int_to_money(0), m.int_to_money(0))
  |> should.equal(m.int_to_money(0))

  m.money_sum(m.float_to_money(1, 2), m.float_to_money(1, 3))
  |> should.equal(m.float_to_money(2, 5))

  m.money_sum(m.float_to_money(2, 80), m.float_to_money(2, 70))
  |> should.equal(m.float_to_money(5, 50))

  m.money_sum(m.float_to_money(3, 2), m.float_to_money(3, 3))
  |> should.equal(m.float_to_money(6, 5))

  m.money_sum(m.float_to_money(-4, 90), m.float_to_money(-4, 90))
  |> should.equal(m.float_to_money(-9, 80))

  m.money_sum(m.float_to_money(-5, 90), m.float_to_money(4, 80))
  |> should.equal(m.float_to_money(-1, 10))

  m.money_sum(m.float_to_money(-5, 70), m.float_to_money(4, 80))
  |> should.equal(m.float_to_money(0, 90) |> m.negate)

  m.money_sum(m.float_to_money(-6, 70), m.float_to_money(7, 80))
  |> should.equal(m.float_to_money(1, 10))

  m.money_sum(m.float_to_money(-7, 70), m.float_to_money(8, 60))
  |> should.equal(m.float_to_money(0, 90))
}

pub fn string_to_money_test() {
  m.string_to_money("1.80") |> should.equal(m.Money(1, 80, False))
  m.string_to_money("2.8") |> should.equal(m.Money(2, 80, False))
  m.string_to_money("3") |> should.equal(m.Money(3, 0, False))
  m.string_to_money("4.00") |> should.equal(m.Money(4, 0, False))
  m.string_to_money("5,00") |> should.equal(m.Money(5, 0, False))
  m.string_to_money("6,11111111") |> should.equal(m.Money(6, 11, False))
  m.string_to_money("-7.11") |> should.equal(m.Money(7, 11, True))
  m.string_to_money("8.01") |> should.equal(m.Money(8, 1, False))
}
