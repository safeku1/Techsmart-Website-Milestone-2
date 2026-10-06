function setupMenu() {
  var btn = document.querySelector(".menu-btn");
  var nav = document.querySelector("nav");
  if (!btn || !nav) return;
  btn.addEventListener("click", function () {
    var open = nav.classList.toggle("open");
    btn.setAttribute("aria-expanded", open ? "true" : "false");
  });
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
document.addEventListener("DOMContentLoaded", function () {
  setupMenu();
  setupForms();
  setupCards();
});
