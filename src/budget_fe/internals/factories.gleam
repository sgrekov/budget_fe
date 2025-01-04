import budget_test.{
  type Allocation, type Category, type Cycle, type MonthInYear, type Transaction,
} as m
import budget_test.{Allocation, Category, Cycle, MonthInYear, Transaction}
import gleam/list
import gleam/option
import rada/date as d

//FACTORIES
pub fn allocations(cycle: Cycle) -> List(Allocation) {
  let c = Cycle(2024, d.Dec)
  [
    Allocation(id: "1", amount: m.int_to_money(80), category_id: "1", date: c),
    Allocation(id: "2", amount: m.int_to_money(120), category_id: "2", date: c),
    Allocation(id: "3", amount: m.int_to_money(150), category_id: "3", date: c),
    Allocation(
      id: "4",
      amount: m.float_to_money(100, 2),
      category_id: "4",
      date: c,
    ),
    Allocation(
      id: "5",
      amount: m.float_to_money(150, 2),
      category_id: "5",
      date: c,
    ),
    Allocation(
      id: "6",
      amount: m.float_to_money(500, 2),
      category_id: "6",
      date: c,
    ),
  ]
  |> list.filter(fn(a) { a.date == cycle })
}

pub fn categories() -> List(Category) {
  [
    Category(
      id: "1",
      name: "Subscriptions",
      target: option.Some(m.Monthly(m.float_to_money(60, 0))),
      inflow: False,
    ),
    Category(
      id: "2",
      name: "Shopping",
      target: option.Some(m.Monthly(m.float_to_money(40, 0))),
      inflow: False,
    ),
    Category(
      id: "3",
      name: "Goals",
      target: option.Some(m.Custom(
        m.float_to_money(150, 0),
        MonthInYear(2, 2025),
      )),
      inflow: False,
    ),
    Category(
      id: "4",
      name: "Vacation",
      target: option.Some(m.Monthly(m.float_to_money(100, 0))),
      inflow: False,
    ),
    Category(
      id: "5",
      name: "Entertainment",
      target: option.Some(m.Monthly(m.float_to_money(200, 0))),
      inflow: False,
    ),
    Category(
      id: "6",
      name: "Groceries",
      target: option.Some(m.Monthly(m.float_to_money(500, 0))),
      inflow: False,
    ),
    Category(
      id: "7",
      name: "Ready to assign",
      target: option.None,
      inflow: True,
    ),
  ]
}

pub fn transactions() -> List(Transaction) {
  [
    Transaction(
      id: "1",
      date: d.from_calendar_date(2025, d.Jan, 1),
      payee: "Amazon",
      category_id: "5",
      value: m.float_to_money(-10, 0),
    ),
    Transaction(
      id: "1",
      date: d.from_calendar_date(2024, d.Dec, 2),
      payee: "Amazon",
      category_id: "5",
      value: m.float_to_money(-50, 0),
    ),
    Transaction(
      id: "2",
      date: d.from_calendar_date(2024, d.Dec, 2),
      payee: "Bauhaus",
      category_id: "5",
      value: m.float_to_money(-50, 0),
    ),
    Transaction(
      id: "3",
      date: d.from_calendar_date(2024, d.Dec, 2),
      payee: "Rewe",
      category_id: "6",
      value: m.float_to_money(-50, 0),
    ),
    Transaction(
      id: "4",
      date: d.from_calendar_date(2024, d.Dec, 2),
      payee: "Vodafone",
      category_id: "1",
      value: m.float_to_money(-50, 0),
    ),
    Transaction(
      id: "5",
      date: d.from_calendar_date(2024, d.Dec, 2),
      payee: "Steam",
      category_id: "5",
      value: m.float_to_money(-50, 0),
    ),
    Transaction(
      id: "6",
      date: d.from_calendar_date(2024, d.Dec, 2),
      payee: "Duo",
      category_id: "1",
      value: m.float_to_money(-50, 60),
    ),
    Transaction(
      id: "7",
      date: d.from_calendar_date(2024, d.Dec, 2),
      payee: "O2",
      category_id: "1",
      value: m.float_to_money(-50, 0),
    ),
    Transaction(
      id: "8",
      date: d.from_calendar_date(2024, d.Dec, 2),
      payee: "Trade Republic",
      category_id: "7",
      value: m.float_to_money(1000, 0),
    ),
    Transaction(
      id: "8",
      date: d.from_calendar_date(2024, d.Nov, 27),
      payee: "O2",
      category_id: "1",
      value: m.float_to_money(-1, 50),
    ),
    Transaction(
      id: "8",
      date: d.from_calendar_date(2024, d.Nov, 26),
      payee: "O2",
      category_id: "1",
      value: m.float_to_money(-1, 50),
    ),
  ]
}
