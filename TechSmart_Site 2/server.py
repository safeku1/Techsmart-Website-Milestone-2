#!/usr/bin/env python3
"""Serve the site and process donations through TechSmart's Stripe/GiveWP account."""
from http.cookiejar import CookieJar
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import HTTPCookieProcessor, Request, build_opener
import html as htmlmod
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
GIVE_URL = "https://techsmartseniors.org/give/donate?giveDonationFormInIframe=1"
GIVE_POST = "https://techsmartseniors.org/give/donate/?payment-mode=stripe_checkout&form-id=247483"
# Public Stripe publishable key from TechSmart's live GiveWP form. Secret keys stay on GiveWP.
LIVE_PK = (
    "pk_live_51Nf4iREDW8JA6hyd4QtUWMLdb0xD19NlatRdZsd5h1LQIIg3SmF5rMi8Q8WQB02nBaj3ulYK3Rf36gTtfaZS2jcv00CCrpkmMJ"
)
UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)
HIDDEN = re.compile(
    r'<input[^>]*type=["\']hidden["\'][^>]*>',
    re.I,
)
ATTR = re.compile(r'([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*"([^"]*)"|([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*\'([^\']*)\'')


def opener():
    jar = CookieJar()
    return build_opener(HTTPCookieProcessor(jar)), jar


def fetch(op, url, data=None):
    headers = {
        "User-Agent": UA,
        "Accept": "text/html,application/xhtml+xml",
        "Referer": "https://techsmartseniors.org/donate/",
        "Origin": "https://techsmartseniors.org",
    }
    if data is not None:
        headers["Content-Type"] = "application/x-www-form-urlencoded"
    req = Request(url, data=data, headers=headers)
    with op.open(req, timeout=30) as resp:
        return resp.geturl(), resp.read()


def hidden_fields(html):
    fields = {}
    for tag in HIDDEN.findall(html):
        attrs = {}
        for m in ATTR.finditer(tag):
            key = (m.group(1) or m.group(3) or "").lower()
            val = m.group(2) if m.group(2) is not None else m.group(4)
            attrs[key] = htmlmod.unescape(val or "")
        name = attrs.get("name")
        if name:
            fields[name] = attrs.get("value", "")
    return fields


def process_donation(payload):
    amount = str(payload.get("amount") or "").strip()
    payment_method = str(payload.get("paymentMethodId") or "").strip()
    first = str(payload.get("first") or "").strip()
    last = str(payload.get("last") or "").strip()
    email = str(payload.get("email") or "").strip()
    card_name = str(payload.get("cardName") or "").strip() or (first + " " + last).strip()
    price_id = str(payload.get("priceId") or "custom").strip()
    try:
        gift = float(amount)
    except (TypeError, ValueError):
        gift = 0
    if gift < 5 or not payment_method or not first or not last or not email:
        return 400, {"ok": False, "error": "Please complete the donation amount and your contact details."}

    op, _jar = opener()
    try:
        _url, raw = fetch(op, GIVE_URL)
        html = raw.decode("utf-8", "replace")
    except (HTTPError, URLError, TimeoutError, OSError) as exc:
        return 502, {"ok": False, "error": "The donation form could not be reached. Please try again shortly."}

    fields = hidden_fields(html)
    fields.update({
        "give-amount": "%.2f" % gift,
        "give-price-id": price_id,
        "give_stripe_payment_method": payment_method,
        "payment-mode": "stripe_checkout",
        "give_first": first,
        "give_last": last,
        "give_email": email,
        "card_name": card_name,
        "give_validate_stripe_payment_fields": "1",
        "give_action": "purchase",
        "give-gateway": "stripe_checkout",
        "give_embed_form": "1",
        "give-purchase": "Donate Now",
        "give-form-id": fields.get("give-form-id") or "247483",
        "give-form-id-prefix": fields.get("give-form-id-prefix") or "247483-1",
        "give-form-title": fields.get("give-form-title") or "Donate to TechSmart",
        "give-current-url": "https://techsmartseniors.org/give/donate/",
        "give-form-url": "https://techsmartseniors.org/give/donate/",
        "give-honeypot": "",
    })
    body = urlencode(fields).encode("utf-8")
    try:
        final_url, raw = fetch(op, GIVE_POST, data=body)
        html = raw.decode("utf-8", "replace")
    except HTTPError as exc:
        html = exc.read().decode("utf-8", "replace") if exc.fp else ""
        final_url = GIVE_POST
        if exc.code >= 500:
            return 502, {"ok": False, "error": "TechSmart’s payment processor is temporarily unavailable."}
    except (URLError, TimeoutError, OSError):
        return 502, {"ok": False, "error": "We could not complete the payment. Please try again."}

    low = html.lower()
    error = ""
    m = re.search(r'class="give_error"[^>]*>(.*?)</p>', html, re.I | re.S)
    if m:
        error = re.sub("<[^>]+>", "", m.group(1)).strip()
    if "give_errors" in low or "give-error" in low or error:
        return 400, {"ok": False, "error": error or "Your card could not be charged. Please check the details and try again."}
    success_hint = (
        "thank you" in low
        or "give-receipt" in low
        or "donation-confirmation" in low
        or "payment-confirmation" in low
        or "donation has been" in low
    )
    if not success_hint:
        return 400, {"ok": False, "error": "The donation did not complete. Please check your card details and try again."}
    return 200, {"ok": True, "url": final_url}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def json_response(self, code, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path in ("/donate-config", "/donate-config/"):
            self.json_response(200, {"publishableKey": LIVE_PK, "processor": "stripe"})
            return
        super().do_GET()

    def do_POST(self):
        path = self.path.split("?", 1)[0]
        if path not in ("/donate-process", "/donate-process/"):
            self.send_error(404, "Not found")
            return
        length = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(length) if length else b"{}"
        try:
            payload = json.loads(raw.decode("utf-8") or "{}")
        except ValueError:
            self.json_response(400, {"ok": False, "error": "Invalid donation request."})
            return
        if not isinstance(payload, dict):
            self.json_response(400, {"ok": False, "error": "Invalid donation request."})
            return
        code, result = process_donation(payload)
        self.json_response(code, result)


def main():
    port = 8770
    if len(sys.argv) > 1:
        port = int(sys.argv[1])
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print("Serving TechSmart_Site on http://127.0.0.1:%s" % port, flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
