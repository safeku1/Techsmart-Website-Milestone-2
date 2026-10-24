function setupMenu() {
  var btn = document.querySelector(".menu-btn");
  var nav = document.querySelector("nav");
  if (btn && nav) {
    btn.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }
}
function setupForms() {
  document.querySelectorAll("form[data-mock]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var note = form.querySelector(".thanks");
      note.style.display = "block";
      note.focus();
      form.reset();
    });
  });
}
function setupCards() {
  document.querySelectorAll("a.card").forEach(function (card) {
    card.addEventListener("click", function () {
      var icon = card.querySelector(".icon");
      if (icon) icon.classList.add("lit");
    });
  });
}
function setupReviews() {
  var form = document.querySelector("form[data-review]");
  var list = document.getElementById("reviews");
  if (!form || !list) return;
  function paint(items) {
    list.innerHTML = "";
    items.forEach(function (item) {
      var box = document.createElement("article");
      box.className = "review";
      box.innerHTML = "<strong></strong><span></span><p></p>";
      box.querySelector("strong").textContent = item.name;
      box.querySelector("span").textContent = item.rating;
      box.querySelector("p").textContent = item.text;
      list.appendChild(box);
    });
  }
  localStorage.removeItem("techsmart-reviews");
  var saved = [];
  try { saved = JSON.parse(localStorage.getItem("techsmart-reviews-v2") || "[]"); } catch (e) {}
  paint(saved);
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    var item = {
      name: form.name.value.trim(),
      rating: form.rating.value,
      text: form.text.value.trim()
    };
    saved.unshift(item);
    localStorage.setItem("techsmart-reviews-v2", JSON.stringify(saved.slice(0, 12)));
    paint(saved);
    var note = form.querySelector(".thanks");
    note.style.display = "block";
    note.focus();
    form.reset();
  });
}
document.addEventListener("DOMContentLoaded", function () {
  setupMenu();
  setupForms();
  setupCards();
  setupReviews();
});
