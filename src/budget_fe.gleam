import gleam/dynamic
import gleam/int
import gleam/list
import lustre
import lustre/attribute
import lustre/effect
import lustre/element
import lustre/element/html
import lustre/event
import lustre_http

pub fn main() {
  let app = lustre.application(init, update, view)
  let assert Ok(_) = lustre.start(app, "#app", Nil)

  Nil
}

pub type Msg {
  UserIncrementedCount
  UserDecrementedCount
  ApiReturnedCats(Result(List(Cat), lustre_http.HttpError))
}

pub type Model {
  Model(count: Int, cats: List(Cat))
}

pub fn update(model: Model, msg: Msg) -> #(Model, effect.Effect(Msg)) {
  case msg {
    UserIncrementedCount -> #(Model(..model, count: model.count + 1), get_cat())
    UserDecrementedCount -> #(
      Model(count: model.count - 1, cats: list.drop(model.cats, 1)),
      effect.none(),
    )
    ApiReturnedCats(Ok(api_cats)) -> {
      let assert [cat, ..] = api_cats
      #(Model(..model, cats: [cat, ..model.cats]), effect.none())
    }
    ApiReturnedCats(Error(_)) -> #(model, effect.none())
  }
}

pub fn view(model: Model) -> element.Element(Msg) {
  let count = int.to_string(model.count)

  html.div([], [
    html.button([event.on_click(UserIncrementedCount)], [element.text("+")]),
    element.text(count),
    html.button([event.on_click(UserDecrementedCount)], [element.text("-")]),
    html.div(
      [],
      list.map(model.cats, fn(cat) {
        html.img([
          attribute.src(cat.url),
          attribute.width(400),
          attribute.height(400),
        ])
      }),
    ),
  ])
}

pub type Cat {
  Cat(id: String, url: String)
}

fn get_cat() -> effect.Effect(Msg) {
  let decoder =
    dynamic.decode2(
      Cat,
      dynamic.field("id", dynamic.string),
      dynamic.field("url", dynamic.string),
    )
  let expect = lustre_http.expect_json(dynamic.list(decoder), ApiReturnedCats)

  lustre_http.get("https://api.thecatapi.com/v1/images/search", expect)
}

fn init(_flags) -> #(Model, effect.Effect(Msg)) {
  #(Model(0, []), effect.none())
}
