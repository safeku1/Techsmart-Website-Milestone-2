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
  document.querySelectorAll("form[action*='formspree.io']").forEach(function (form) {
    if (form.id === "donate-form" || form.id === "zip-form") return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var button = form.querySelector("[type='submit']");
      var thanks = form.querySelector(".thanks");
      var classField = form.querySelector("[name='class']");
      var className = classField ? classField.value : "";
      if (button) button.disabled = true;
      fetch(form.getAttribute("action"), {
        method: (form.getAttribute("method") || "POST").toUpperCase(),
        body: new FormData(form),
        headers: { Accept: "application/json" }
      }).then(function (response) {
        if (!response.ok) throw new Error("send");
        form.reset();
        if (thanks) {
          thanks.style.display = "block";
          thanks.focus();
        }
        if (form.id === "register-form") {
          var confirmBox = document.getElementById("register-confirm");
          var confirmText = document.getElementById("register-confirm-text");
          if (confirmText) {
            confirmText.textContent = className
              ? "You are registered for " + className + "."
              : "We received your registration.";
          }
          form.hidden = true;
          if (confirmBox) {
            confirmBox.hidden = false;
            confirmBox.focus();
          }
        } else if (button) {
          button.disabled = false;
        }
      }).catch(function () {
        if (button) button.disabled = false;
        window.alert("We could not send that just now. Please try again.");
      });
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
var WORKSHOPS = [
  {
    id: "alpharetta-iphone",
    name: "iPhone Basics",
    description: "Learn the buttons, settings, and everyday apps on an iPhone at a comfortable pace.",
    partner: "Rotary Club of Alpharetta",
    address: "Alpharetta Branch Library, 10 Park Plaza, Alpharetta, GA 30009",
    zip: "30009",
    when: "Tuesday, December 2, 2026 · 10:00 AM – 11:30 AM",
    format: "In-person",
    seats: "Open"
  },
  {
    id: "atlanta-connect",
    name: "Stay Connected: Video Calls and Apps",
    description: "Practice email, texting, and video calls so you can stay close to family and friends.",
    partner: "Hands On Atlanta",
    address: "Greater Atlanta partner center, Atlanta, GA 30308",
    zip: "30308",
    when: "Thursday, December 4, 2026 · 1:00 PM – 2:30 PM",
    format: "In-person",
    seats: "Open"
  },
  {
    id: "marietta-android",
    name: "Android Phone Basics",
    description: "Get comfortable with an Android phone, including calls, photos, and useful settings.",
    partner: "TechSmart partner center",
    address: "Marietta, GA 30060",
    zip: "30060",
    when: "Wednesday, December 10, 2026 · 10:00 AM – 11:30 AM",
    format: "In-person",
    seats: "Limited"
  },
  {
    id: "decatur-safety",
    name: "Stay Safer Online",
    description: "Simple steps to spot scams, protect passwords, and keep your information safer.",
    partner: "TechSmart partner center",
    address: "Decatur Library, 215 Sycamore St, Decatur, GA 30030",
    zip: "30030",
    when: "Monday, December 8, 2026 · 2:00 PM – 3:30 PM",
    format: "In-person",
    seats: "Open"
  },
  {
    id: "roswell-group",
    name: "Group Training Session",
    description: "A friendly group class for everyday technology. Questions are welcome, and we go at your pace.",
    partner: "TechSmart partner center",
    address: "Roswell Library, 115 Norcross St, Roswell, GA 30075",
    zip: "30075",
    when: "Friday, December 12, 2026 · 10:00 AM – 11:30 AM",
    format: "In-person",
    seats: "Open"
  },
  {
    id: "sandy-one",
    name: "One-on-One Training",
    description: "A 60-minute private lesson tailored to what you want to learn on your own device.",
    partner: "TechSmart",
    address: "Sandy Springs Library, 395 Mount Vernon Hwy NE, Sandy Springs, GA 30328",
    zip: "30328",
    when: "By appointment, weekday mornings",
    format: "In-person",
    seats: "Open"
  },
  {
    id: "online-group",
    name: "Group Training Session (Online)",
    description: "Join from home. We will send a simple link and walk through the class together.",
    partner: "TechSmart",
    address: "Online",
    zip: "00000",
    when: "Wednesday, December 3, 2026 · 11:00 AM – 12:00 PM",
    format: "Online",
    seats: "Open",
    online: true
  },
  {
    id: "online-safety",
    name: "Stay Safer Online (Live Video)",
    description: "An online class covering passwords, spam calls, and how to pause before clicking.",
    partner: "TechSmart",
    address: "Online",
    zip: "00000",
    when: "Thursday, December 11, 2026 · 1:00 PM – 2:00 PM",
    format: "Online",
    seats: "Open",
    online: true
  }
];

function setupRegister() {
  var form = document.getElementById("register-form");
  if (!form) return;
  var params = new URLSearchParams(window.location.search);
  var classSel = document.getElementById("class-choice");
  var formatSel = document.getElementById("format");
  var whenInput = document.getElementById("when");
  var chosen = document.getElementById("chosen-workshop");
  var className = params.get("class");
  var format = params.get("format");
  var when = params.get("when");
  var workshopId = params.get("workshop");
  var workshop = null;
  if (workshopId) {
    for (var i = 0; i < WORKSHOPS.length; i++) {
      if (WORKSHOPS[i].id === workshopId) { workshop = WORKSHOPS[i]; break; }
    }
  }
  if (workshop) {
    className = className || workshop.name;
    format = format || workshop.format;
    when = when || workshop.when;
    chosen.hidden = false;
    chosen.textContent = "You are registering for " + workshop.name + " · " + workshop.format + " · " + workshop.when + ".";
  }
  if (className && classSel) {
    for (var c = 0; c < classSel.options.length; c++) {
      if (classSel.options[c].value === className) { classSel.value = className; break; }
    }
  }
  if (format && formatSel) formatSel.value = format;
  if (when && whenInput && !whenInput.value) whenInput.value = when;
}

function nearbyWorkshops(zip) {
  var results = [];
  WORKSHOPS.forEach(function (item) {
    var score;
    if (item.online) score = 40;
    else score = Math.abs(parseInt(item.zip, 10) - parseInt(zip, 10));
    if (item.online || score <= 90 || item.zip.slice(0, 3) === zip.slice(0, 3)) {
      results.push({ item: item, score: score });
    }
  });
  results.sort(function (a, b) { return a.score - b.score; });
  return results;
}

function renderWorkshops(zip) {
  var list = document.getElementById("workshop-list");
  var status = document.getElementById("workshop-status");
  if (!list || !status) return;
  list.innerHTML = "";
  var matches = nearbyWorkshops(zip);
  if (!matches.length) {
    status.textContent = "We did not find a workshop next door to " + zip + ". Please try another Greater Atlanta ZIP code, or register for an online class.";
    return;
  }
  var inPerson = matches.filter(function (row) { return !row.item.online; }).length;
  status.textContent = inPerson
    ? "Workshops near " + zip + ", plus online options you can join from home."
    : "Online TechSmart workshops you can join from " + zip + ".";
  matches.forEach(function (row) {
    var item = row.item;
    var card = document.createElement("article");
    card.className = "workshop-card";
    var title = document.createElement("h3");
    title.textContent = item.name;
    var desc = document.createElement("p");
    desc.textContent = item.description;
    var meta = document.createElement("div");
    meta.className = "workshop-meta";
    [
      ["Partner", item.partner],
      ["Location", item.address],
      ["When", item.when],
      ["Format", item.format],
      ["Registration", item.seats === "Open" ? "Open — seats available" : item.seats === "Limited" ? "Limited seats" : "Waitlist"]
    ].forEach(function (pair) {
      var line = document.createElement("div");
      var label = document.createElement("strong");
      label.textContent = pair[0] + ": ";
      line.appendChild(label);
      line.appendChild(document.createTextNode(pair[1]));
      meta.appendChild(line);
    });
    var link = document.createElement("a");
    link.className = "btn btn-gold";
    link.textContent = item.seats === "Full" ? "Join Waitlist" : "Register";
    link.href = "register.html?workshop=" + encodeURIComponent(item.id) +
      "&class=" + encodeURIComponent(item.name) +
      "&format=" + encodeURIComponent(item.format) +
      "&when=" + encodeURIComponent(item.when);
    card.appendChild(title);
    card.appendChild(desc);
    card.appendChild(meta);
    card.appendChild(link);
    list.appendChild(card);
  });
}

function setupZipSearch() {
  var form = document.getElementById("zip-form");
  if (!form) return;
  var zipInput = document.getElementById("zip");
  var error = document.getElementById("zip-error");
  function search(zip) {
    if (!/^\d{5}$/.test(zip)) {
      error.hidden = false;
      zipInput.focus();
      document.getElementById("workshop-list").innerHTML = "";
      document.getElementById("workshop-status").textContent = "";
      return false;
    }
    error.hidden = true;
    renderWorkshops(zip);
    var results = document.getElementById("workshop-list");
    if (results) results.scrollIntoView({ behavior: "smooth", block: "start" });
    return true;
  }
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    search(zipInput.value.trim());
  });
  var preset = new URLSearchParams(window.location.search).get("zip");
  if (preset) {
    zipInput.value = preset;
    search(preset.trim());
  }
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
  setupRegister();
  setupZipSearch();
});
