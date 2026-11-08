function setupBack() {
  var links = document.querySelectorAll("[data-back]");
  if (!links.length) return;
  function siteReferrer() {
    if (!document.referrer) return "";
    try {
      var url = new URL(document.referrer);
      if (url.origin === window.location.origin) return url.href;
    } catch (e) {}
    return "";
  }
  links.forEach(function (link) {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      var previous = siteReferrer();
      if (previous) {
        window.history.back();
        return;
      }
      window.location.href = link.getAttribute("href") || "index.html";
    });
  });
}
function setupMenu() {
  var btn = document.querySelector(".menu-btn");
  var nav = document.querySelector("header nav");
  if (btn && nav) {
    btn.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }
}
function setupHelpType() {
  var type = document.getElementById("type");
  if (!type) return;
  var q = new URLSearchParams(window.location.search).get("type");
  if (q === "one-on-one") type.value = "One-on-one training";
  if (q === "group") type.value = "Group workshop";
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
function setupDonate() {
  var form = document.getElementById("donate-form");
  if (!form) return;
  var amountInput = document.getElementById("amount");
  var other = document.getElementById("other");
  var statusEl = document.getElementById("donate-status");
  var submitBtn = document.getElementById("donate-submit");
  var success = document.getElementById("donate-success");
  var successText = document.getElementById("donate-success-text");
  var LIVE_PK = "pk_live_51Nf4iREDW8JA6hyd4QtUWMLdb0xD19NlatRdZsd5h1LQIIg3SmF5rMi8Q8WQB02nBaj3ulYK3Rf36gTtfaZS2jcv00CCrpkmMJ";
  var PRICE = { "10": "0", "25": "1", "50": "2", "100": "3", "250": "5" };

  function setStatus(message, kind) {
    statusEl.textContent = message || "";
    statusEl.className = "donate-status" + (kind ? " is-" + kind : "");
  }
  function selectedAmount() {
    var raw = amountInput.value === "custom" ? other.value : amountInput.value;
    return parseFloat(String(raw).replace(/[^0-9.]/g, ""));
  }

  document.querySelectorAll(".amt").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".amt").forEach(function (b) { b.classList.remove("is-on"); });
      btn.classList.add("is-on");
      amountInput.value = btn.getAttribute("data-amount");
      if (amountInput.value === "custom") {
        other.required = true;
        other.focus();
      } else {
        other.required = false;
        other.value = "";
      }
    });
  });
  other.addEventListener("input", function () {
    document.querySelectorAll(".amt").forEach(function (b) {
      b.classList.toggle("is-on", b.getAttribute("data-amount") === "custom");
    });
    amountInput.value = "custom";
    other.required = true;
  });

  if (typeof Stripe === "undefined") {
    setStatus("The secure payment fields could not load. Please refresh the page.", "error");
    submitBtn.disabled = true;
    return;
  }

  var stripe = Stripe(LIVE_PK);
  var elements = stripe.elements();
  var style = {
    base: {
      fontSize: "18px",
      color: "#2c333c",
      fontFamily: "Segoe UI, Helvetica Neue, Helvetica, Arial, sans-serif",
      "::placeholder": { color: "#7a8490" }
    },
    invalid: { color: "#b42318" }
  };
  var cardNumber = elements.create("cardNumber", { style: style, showIcon: true });
  var cardExpiry = elements.create("cardExpiry", { style: style });
  var cardCvc = elements.create("cardCvc", { style: style });
  cardNumber.mount("#card-number");
  cardExpiry.mount("#card-expiry");
  cardCvc.mount("#card-cvc");
  [cardNumber, cardExpiry, cardCvc].forEach(function (el) {
    el.on("change", function (event) {
      if (event.error) setStatus(event.error.message, "error");
      else if (statusEl.classList.contains("is-error")) setStatus("");
    });
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    var gift = selectedAmount();
    if (!(gift >= 5)) {
      setStatus("Please enter a donation of at least $5.", "error");
      other.focus();
      return;
    }
    var first = document.getElementById("first-name").value.trim();
    var last = document.getElementById("last-name").value.trim();
    var email = document.getElementById("email").value.trim();
    var cardName = document.getElementById("card-name").value.trim();
    submitBtn.disabled = true;
    setStatus("Processing your donation…", "wait");
    stripe.createPaymentMethod({
      type: "card",
      card: cardNumber,
      billing_details: { name: first + " " + last, email: email }
    }).then(function (result) {
      if (result.error) {
        submitBtn.disabled = false;
        setStatus(result.error.message, "error");
        return;
      }
      var priceId = PRICE[String(Math.round(gift))] || "custom";
      if (amountInput.value === "custom") priceId = "custom";
      return fetch("donate-process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: gift.toFixed(2),
          priceId: priceId,
          first: first,
          last: last,
          email: email,
          cardName: cardName,
          paymentMethodId: result.paymentMethod.id
        })
      }).then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, data: data };
        }).catch(function () {
          return { ok: false, data: { error: "The donation processor sent an unexpected response." } };
        });
      }).then(function (out) {
        if (!out.ok || !out.data || !out.data.ok) {
          submitBtn.disabled = false;
          setStatus((out.data && out.data.error) || "Your donation could not be completed. Please check your card details and try again.", "error");
          return;
        }
        form.hidden = true;
        success.hidden = false;
        successText.textContent = "Your donation of $" + gift.toFixed(2) + " has been received. A receipt will be sent to " + email + ".";
        success.focus();
      });
    }).catch(function () {
      submitBtn.disabled = false;
      setStatus("We could not reach TechSmart’s secure donation processor. Please try again.", "error");
    });
  });
}
function setupHeader() {
  var header = document.querySelector("header");
  if (!header) return;
  function paint() {
    header.classList.toggle("is-scrolled", window.scrollY > 8);
  }
  paint();
  window.addEventListener("scroll", paint, { passive: true });
}
function setupReveal() {
  var nodes = document.querySelectorAll(".card, .panel, .sponsors, .pillars article, .media-card, .feature-box, .photo-frame, .help-story, .content-band, .founder, .class-box, .book-card, .resource-card, .register-cta, .about-block, .donate-embed, .support-card");
  if (!nodes.length) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  nodes.forEach(function (el) { el.classList.add("will-show"); });
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-shown");
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });
  nodes.forEach(function (el) {
    io.observe(el);
    if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add("is-shown");
  });
}
document.addEventListener("DOMContentLoaded", function () {
  setupBack();
  setupMenu();
  setupHelpType();
  setupForms();
  setupCards();
  setupReviews();
  setupHeader();
  setupDonate();
  setupReveal();
});
