#!/usr/bin/env python3
"""Generate PayID + GST integration guide PDF for Jack's Barber Style."""

from fpdf import FPDF
from pathlib import Path

OUTPUT = Path(__file__).resolve().parent / "PayID-GST-Integration-Guide-Jacks-Barber-Style.pdf"


def safe(text):
    """Normalize text for Helvetica (latin-1) output."""
    if not isinstance(text, str):
        text = str(text)
    return (
        text.replace("\u2014", "-")
        .replace("\u2013", "-")
        .replace("\u2192", "->")
        .replace("\u2265", ">=")
        .replace("\u2022", "-")
        .replace("\u2019", "'")
        .replace("\u2018", "'")
    )


class GuidePDF(FPDF):
    def header(self):
        if self.page_no() == 1:
            return
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(100, 100, 100)
        self.cell(0, 8, "PayID & GST Integration Guide - Jack's Barber Style", align="C")
        self.ln(4)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 10, f"Page {self.page_no()}", align="C")

    def cover(self):
        self.add_page()
        self.set_font("Helvetica", "B", 28)
        self.set_text_color(30, 30, 30)
        self.ln(40)
        self.multi_cell(0, 14, "PayID & GST Integration Guide", align="C")
        self.ln(6)
        self.set_font("Helvetica", "", 16)
        self.set_text_color(60, 60, 60)
        self.multi_cell(0, 10, "Jack's Barber Style Website", align="C")
        self.ln(4)
        self.set_font("Helvetica", "", 12)
        self.multi_cell(0, 8, "Wodonga, Victoria, Australia", align="C")
        self.ln(20)
        self.set_font("Helvetica", "", 11)
        self.set_text_color(80, 80, 80)
        body = (
            "A complete reference for accepting PayID payments on your booking website "
            "while meeting Australian GST and tax invoice requirements.\n\n"
            "Prepared: June 2026\n"
            "Applies to: jacks-barber-style website (PayID only - no card processors)"
        )
        self.multi_cell(0, 7, body, align="C")
        self.ln(30)
        self.set_font("Helvetica", "I", 9)
        self.set_text_color(140, 140, 140)
        self.multi_cell(
            0,
            5,
            "Disclaimer: This guide is for planning purposes only. Consult your accountant "
            "or registered tax agent for advice specific to your business structure and turnover.",
            align="C",
        )

    def h1(self, text):
        text = safe(text)
        self.set_font("Helvetica", "B", 16)
        self.set_text_color(20, 20, 20)
        self.multi_cell(0, 9, text)
        self.ln(2)
        self.set_draw_color(180, 140, 60)
        self.set_line_width(0.6)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(4)

    def h2(self, text):
        text = safe(text)
        self.set_font("Helvetica", "B", 12)
        self.set_text_color(40, 40, 40)
        self.multi_cell(0, 7, text)
        self.ln(2)

    def h3(self, text):
        text = safe(text)
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(50, 50, 50)
        self.multi_cell(0, 6, text)
        self.ln(1)

    def body(self, text):
        text = safe(text)
        self.set_font("Helvetica", "", 10)
        self.set_text_color(30, 30, 30)
        self.multi_cell(0, 5.5, text)
        self.ln(2)

    def bullet(self, text):
        text = safe(text)
        self.set_font("Helvetica", "", 10)
        self.set_text_color(30, 30, 30)
        self.cell(6, 5.5, "-")
        self.multi_cell(0, 5.5, text)
        self.ln(1)

    def table(self, headers, rows, col_widths=None):
        if col_widths is None:
            col_widths = [190 / len(headers)] * len(headers)
        self.set_font("Helvetica", "B", 9)
        self.set_fill_color(240, 235, 225)
        for i, h in enumerate(headers):
            self.cell(col_widths[i], 7, safe(h), border=1, fill=True)
        self.ln()
        self.set_font("Helvetica", "", 9)
        fill = False
        for row in rows:
            max_h = 7
            lines = []
            for i, cell in enumerate(row):
                w = col_widths[i]
                lines.append(self.multi_cell(w, 5, safe(str(cell)), split_only=True))
            max_h = max(len(l) for l in lines) * 5
            if max_h < 7:
                max_h = 7
            y0 = self.get_y()
            x0 = self.get_x()
            if y0 + max_h > 270:
                self.add_page()
                y0 = self.get_y()
            for i, cell in enumerate(row):
                x = x0 + sum(col_widths[:i])
                self.set_xy(x, y0)
                self.multi_cell(col_widths[i], 5, safe(str(cell)), border=1)
            self.set_xy(x0, y0 + max_h)
        self.ln(3)

    def code_block(self, text):
        text = safe(text)
        self.set_font("Courier", "", 8)
        self.set_fill_color(245, 245, 245)
        self.set_text_color(20, 20, 20)
        for line in text.split("\n"):
            self.cell(0, 4.5, "  " + line, fill=True, new_x="LMARGIN", new_y="NEXT")
        self.ln(3)


def build():
    pdf = GuidePDF()
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.cover()

    # 1. Overview
    pdf.add_page()
    pdf.h1("1. Overview")
    pdf.body(
        "Jack's Barber Style accepts online bookings with PayID payment — Australia's instant "
        "bank transfer system. No Stripe. No card fees. This guide covers PayID setup, website "
        "integration, and GST compliance for every sale, tax invoice, and BAS lodgment."
    )
    pdf.h2("Your website setup")
    pdf.bullet("Website: Jack's Barber Style booking site (Vercel deployment)")
    pdf.bullet("Payments: PayID only (instant bank transfer via customer's banking app)")
    pdf.bullet("Flow: Client books -> sees PayID + amount + reference -> pays in bank app -> booking confirmed")
    pdf.bullet("Key files: server/payments.js, server/gst.js, api/payments/webhook.js")
    pdf.bullet("Services priced in settings (e.g. Skin Fade $40, Afro Cut $45, Home travel fee $15)")
    pdf.bullet("Transactions recorded in transactions.json with GST split in Staff > Finances")

    pdf.h2("What you will achieve")
    pdf.bullet("Clients can pay by PayID (phone, email, or ABN) from their banking app")
    pdf.bullet("Payments reconcile automatically to bookings where possible")
    pdf.bullet("Every sale includes correct GST breakdown on tax invoices")
    pdf.bullet("Records are ready for quarterly/monthly BAS reporting")

    # 2. PayID explained
    pdf.add_page()
    pdf.h1("2. Understanding PayID")
    pdf.body(
        "PayID is part of Australia's New Payments Platform (NPP). It lets people send money "
        "using an easy identifier — mobile number, email address, or Australian Business Number (ABN) — "
        "instead of BSB and account number. Funds typically arrive in seconds, 24/7, via Osko."
    )
    pdf.h2("PayID vs PayTo vs Osko")
    pdf.table(
        ["Term", "What it is", "Relevance to your website"],
        [
            ["PayID", "Address (e.g. 0478268399 or your@email.com)", "What customers type in their bank app"],
            ["Osko", "Brand name for instant NPP payments", "The speed layer behind PayID transfers"],
            ["PayTo", "Authorised real-time bank debit (NPP)", "Optional gateway feature — not required for basic PayID"],
        ],
        [25, 65, 100],
    )
    pdf.h2("Benefits for a barber shop")
    pdf.bullet("No card processing fees (PayID bank transfers are usually free or low-cost for businesses)")
    pdf.bullet("Instant confirmation — useful for same-day bookings")
    pdf.bullet("No chargebacks (unlike cards)")
    pdf.bullet("Customers trust paying a verified business name in their banking app")
    pdf.h2("Limitations")
    pdf.bullet("Customer must use their banking app to send the payment")
    pdf.bullet("Static PayID requires matching bank deposits to booking references (unless using Azupay webhook)")
    pdf.bullet("PayID cannot be 'swiped' like a card — instructions must be clear on the booking page")

    # 3. Integration options
    pdf.add_page()
    pdf.h1("3. Integration Options (PayID Only)")
    pdf.body(
        "There are two practical paths — both use PayID directly, with no card processors."
    )

    pdf.h2("Option A — Static PayID (Recommended to start)")
    pdf.body(
        "Register a PayID with your business bank (mobile 0478268399 or business email). "
        "The website shows PayID, exact amount, and booking reference after each booking. "
        "You confirm payment in Staff when funds arrive — or automate later with Azupay."
    )
    pdf.h3("Steps")
    pdf.bullet("1. Register PayID in your bank app (CommBank, NAB, Westpac, ANZ, etc.)")
    pdf.bullet("2. Add PAYID and PAYID_NAME to Vercel environment variables")
    pdf.bullet("3. Redeploy — booking form now shows PayID payment instructions")
    pdf.bullet("4. When customer pays, match reference (e.g. b1719567890) in bank feed")
    pdf.bullet("5. Mark booking as paid in Staff area (or wait for Azupay webhook)")
    pdf.h3("Pros / Cons")
    pdf.bullet("Pros: Free, no third-party fees, works immediately, no API contract")
    pdf.bullet("Cons: Manual confirmation unless you add Azupay (Option B)")

    pdf.h2("Option B — Azupay (Automatic confirmation)")
    pdf.body(
        "Azupay provides PayID payment requests with a hosted checkout and real-time webhooks. "
        "When payment arrives, your website auto-confirms the booking — no manual step."
    )
    pdf.table(
        ["Provider", "Best for", "Website integration"],
        [
            ["Azupay", "Dynamic PayID per booking, hosted checkout", "REST API + webhook at /api/payments/webhook"],
            ["Monoova", "PayID receivables, reconciliation APIs", "Create PayID per payment request; webhook on receipt"],
            ["Westpac QuickStream", "Larger businesses, PayID Biller", "REST API; domain-linked PayIDs (e.g. pay@yourdomain.com.au)"],
        ],
        [35, 55, 100],
    )
    pdf.h3("Azupay setup for Jack's Barber Style")
    pdf.bullet("1. Sign up at azupay.com.au and complete business verification")
    pdf.bullet("2. Add AZUPAY_CLIENT_ID, AZUPAY_SECRET to Vercel")
    pdf.bullet("3. Set webhook URL: https://your-site.vercel.app/api/payments/webhook")
    pdf.bullet("4. Client books -> redirected to Azupay checkout OR sees dynamic PayID")
    pdf.bullet("5. Webhook calls markBookingPaid() — booking auto-confirmed")
    pdf.bullet("6. Static PAYID still works as fallback if Azupay API is unavailable")

    # 4. Recommended architecture
    pdf.add_page()
    pdf.h1("4. Recommended Architecture (Static PayID + GST)")
    pdf.body(
        "For Jack's Barber Style, start with static PayID (free, immediate) and add Azupay "
        "later if you want automatic confirmation."
    )
    pdf.h2("Payment flow")
    pdf.code_block(
        "Client -> Booking form -> Server saves booking\n"
        "       -> Shows PayID + exact amount + booking reference + GST breakdown\n"
        "       -> Client pays in banking app\n"
        "       -> Azupay webhook OR staff marks paid\n"
        "       -> markBookingPaid() + tax invoice email\n"
        "       -> Booking confirmed + reminder scheduled"
    )
    pdf.h2("Environment variables (Vercel)")
    pdf.table(
        ["Variable", "Purpose", "Example"],
        [
            ["PAYID", "Your business PayID", "0478268399"],
            ["PAYID_NAME", "Name shown in bank app", "Jack's Barber Style"],
            ["SITE_URL", "Site base URL", "https://jack-barber-rho.vercel.app"],
            ["BUSINESS_ABN", "Tax invoices", "XX XXX XXX XXX"],
            ["GST_REGISTERED", "Show GST on receipts", "true"],
            ["AZUPAY_CLIENT_ID", "Optional auto-confirm", "from Azupay dashboard"],
            ["AZUPAY_SECRET", "Optional auto-confirm", "from Azupay dashboard"],
        ],
        [55, 60, 75],
    )
    pdf.h2("Already built in your website")
    pdf.bullet("server/payments.js — PayID instructions and optional Azupay API")
    pdf.bullet("server/gst.js — GST calculation (total / 11)")
    pdf.bullet("js/booking.js — PayID payment panel after booking")
    pdf.bullet("api/payments/webhook.js — Azupay payment confirmation webhook")
    pdf.bullet("PAYID-SETUP.txt — step-by-step configuration guide")

    # 5. GST fundamentals
    pdf.add_page()
    pdf.h1("5. GST Fundamentals for Barber Services")
    pdf.body(
        "Hairdressing and barber services are taxable supplies in Australia. If your GST turnover "
        "is $75,000 or more in a 12-month period, you must register for GST with the ATO. "
        "Once registered, you charge 10% GST on taxable sales and report it on your BAS."
    )
    pdf.h2("Registration checklist")
    pdf.bullet("Obtain an ABN if you do not have one (abr.gov.au)")
    pdf.bullet("Register for GST via ATO online services or through your tax agent")
    pdf.bullet("Choose accounting method: cash basis (common for small business) or accrual")
    pdf.bullet("Choose reporting cycle: quarterly BAS (most common) or monthly if required")
    pdf.bullet("If turnover under $75,000: GST registration is optional (but you cannot claim input tax credits without it)")

    pdf.h2("How GST applies to your service prices")
    pdf.body(
        "Your website prices (e.g. $40 Skin Fade) should be treated as GST-inclusive once registered. "
        "The GST component is 1/11 of the total price."
    )
    pdf.table(
        ["Service", "Price (inc. GST)", "GST (1/11)", "Ex-GST amount"],
        [
            ["Skin Fade", "$40.00", "$3.64", "$36.36"],
            ["Afro Cut", "$45.00", "$4.09", "$40.91"],
            ["Twists & Retwist", "$50.00", "$4.55", "$45.45"],
            ["Home travel fee", "$15.00", "$1.36", "$13.64"],
            ["Beard Trim", "$25.00", "$2.27", "$22.73"],
        ],
        [48, 47, 47, 48],
    )
    pdf.h3("GST calculation formulas")
    pdf.code_block(
        "GST from inclusive price:  GST = Total / 11\n"
        "Ex-GST amount:            Net = Total - GST  (or Total * 10/11)\n"
        "Price ex-GST to inc-GST:  Total = Net * 1.10"
    )
    pdf.body(
        "Example: Skin Fade $40.00 inclusive -> GST = 40 / 11 = $3.64 (rounded). "
        "Always round GST to the nearest cent (0.5 cents rounds up)."
    )

    # 6. Tax invoices
    pdf.add_page()
    pdf.h1("6. Tax Invoice Requirements")
    pdf.body(
        "When GST-registered, you must issue a tax invoice for taxable sales over $82.50 (including GST) "
        "or whenever a customer requests one (within 28 days). PayID payments do not change these rules — "
        "you still need a proper tax invoice."
    )
    pdf.h2("Required fields (sales under $1,000)")
    pdf.bullet("The words 'Tax Invoice'")
    pdf.bullet("Your business name: Jack's Barber Style")
    pdf.bullet("Your Australian Business Number (ABN)")
    pdf.bullet("Date the invoice is issued")
    pdf.bullet("Description of services (e.g. 'Skin Fade — in-shop, 15 Jun 2026 10:00 AM')")
    pdf.bullet("Quantity and price (or a statement that total price includes GST)")
    pdf.bullet("GST amount payable OR statement 'Total price includes GST'")
    pdf.bullet("Extent to which each item is a taxable sale")
    pdf.h2("Additional requirement for invoices $1,000+")
    pdf.bullet("Customer's identity or ABN must appear on the invoice")

    pdf.h2("Sample tax invoice layout")
    pdf.set_font("Courier", "", 8)
    pdf.set_fill_color(252, 250, 245)
    sample = (
        "TAX INVOICE\n"
        "Jack's Barber Style\n"
        "47 O'Meara Street, Wodonga VIC 3690\n"
        "ABN: [Your ABN]\n"
        "Phone: 0478 268 399 | Email: Jacqueskatumbulu@gmail.com\n\n"
        "Invoice #: INV-2026-0042        Date: 28/06/2026\n"
        "Booking ref: bk_abc123\n\n"
        "Bill to: John Smith\n"
        "         john@example.com\n\n"
        "Description                          Qty   Amount\n"
        "Skin Fade — in-shop                    1    $40.00\n"
        "  (Taxable supply — GST included)\n\n"
        "Subtotal (ex GST)                           $36.36\n"
        "GST (10%)                                    $3.64\n"
        "TOTAL (inc GST)                             $40.00\n\n"
        "Payment method: PayID\n"
        "Payment reference: bk_abc123\n"
        "Paid: 28/06/2026"
    )
    for line in sample.split("\n"):
        pdf.cell(0, 4.2, "  " + safe(line), fill=True, new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    pdf.h2("PayID on tax invoices")
    pdf.body(
        "You may show your PayID as a payment option on invoices (e.g. 'Pay via PayID: 0478268399'). "
        "Always include the exact amount and a unique reference (booking ID) so you can reconcile payment. "
        "After payment is confirmed, issue the tax invoice as a receipt."
    )

    # 7. BAS reporting
    pdf.add_page()
    pdf.h1("7. BAS Reporting & Record Keeping")
    pdf.h2("Simpler BAS (turnover under $10 million)")
    pdf.body("Most small businesses report three amounts each BAS period:")
    pdf.table(
        ["BAS Label", "What to report", "Your source"],
        [
            ["G1", "Total sales (inc GST)", "Sum of transactions.json amounts for the period"],
            ["1A", "GST on sales", "Sum of GST portions (total / 11 for taxable sales)"],
            ["1B", "GST credits on purchases", "GST paid on business expenses (rent, supplies, tools)"],
        ],
        [25, 65, 100],
    )
    pdf.body(
        "PayID bank transfers have no card processing fees — your records are simpler. "
        "Keep bank statements and booking references for each deposit."
    )
    pdf.h2("Records to keep (5 years minimum)")
    pdf.bullet("Tax invoices issued to customers")
    pdf.bullet("Payment records (bank statements, PayID transaction list, Azupay dashboard if used)")
    pdf.bullet("Booking records (bookings.json / admin export)")
    pdf.bullet("Expense receipts with GST shown")
    pdf.bullet("BAS worksheets or accounting software reports (Xero, MYOB, QuickBooks)")

    pdf.h2("Recommended accounting software integration")
    pdf.bullet("Xero / MYOB / QuickBooks — import bank feed; match PayID deposits to booking references")
    pdf.bullet("Match each deposit to a booking reference for clean audit trail")
    pdf.bullet("Use bank rules to auto-categorise recurring expenses")

    # 8. Implementation roadmap
    pdf.add_page()
    pdf.h1("8. Step-by-Step Implementation Roadmap")
    pdf.h2("Phase 1 — Business & GST setup (Week 1)")
    pdf.bullet("Confirm ABN and register for GST if turnover requires it")
    pdf.bullet("Decide: all prices GST-inclusive (recommended for consumer-facing barber shop)")
    pdf.bullet("Open or verify business bank account; register PayID with your bank")
    pdf.bullet("Choose integration: static PayID (Option A) or Azupay (Option B)")

    pdf.h2("Phase 2 — PayID on website (Week 1–2)")
    pdf.bullet("Add PAYID and PAYID_NAME to Vercel; redeploy")
    pdf.bullet("Test booking: PayID instructions appear with correct amount and reference")
    pdf.bullet("Optional: configure Azupay for automatic webhook confirmation")
    pdf.bullet("Test full flow: book -> pay in bank app -> confirm -> booking status = confirmed")

    pdf.h2("Phase 3 — GST & invoicing (Week 3–4)")
    pdf.bullet("Add gst.js helper with calculateGstFromInclusive(total) function")
    pdf.bullet("Auto-generate tax invoice on markBookingPaid() — email PDF to client")
    pdf.bullet("Update admin Finances view to show: Gross | GST | Net columns")
    pdf.bullet("Add monthly/quarterly export CSV for BAS preparation")

    pdf.h2("Phase 4 — Go live & monitor (Week 3+)")
    pdf.bullet("Remove any old STRIPE_* environment variables from Vercel")
    pdf.bullet("Update website: payment messaging says PayID only")
    pdf.bullet("Monitor first 10 transactions for correct amounts and GST")
    pdf.bullet("Lodg first BAS with accountant review")

    # 9. Code reference
    pdf.add_page()
    pdf.h1("9. Code Reference — GST Helper")
    pdf.body("Add this module to support GST calculations across payments and invoices:")
    pdf.code_block(
        "// server/gst.js\n"
        "const GST_RATE = 0.10;\n\n"
        "function isGstRegistered() {\n"
        "  return process.env.GST_REGISTERED === 'true';\n"
        "}\n\n"
        "function gstFromInclusive(totalIncGst) {\n"
        "  if (!isGstRegistered()) return 0;\n"
        "  return Math.round((totalIncGst / 11) * 100) / 100;\n"
        "}\n\n"
        "function netFromInclusive(totalIncGst) {\n"
        "  return Math.round((totalIncGst - gstFromInclusive(totalIncGst)) * 100) / 100;\n"
        "}\n\n"
        "function breakdown(totalIncGst) {\n"
        "  const gst = gstFromInclusive(totalIncGst);\n"
        "  return { total: totalIncGst, gst, net: totalIncGst - gst };\n"
        "}\n\n"
        "module.exports = { isGstRegistered, gstFromInclusive, netFromInclusive, breakdown };"
    )

    pdf.h2("PayID payment response (already in server/payments.js)")
    pdf.code_block(
        "// Returned to booking form after POST /api/bookings\n"
        "{\n"
        "  ok: true,\n"
        "  id: 'b1719567890123',\n"
        "  amount: 40,\n"
        "  payment: {\n"
        "    method: 'payid',\n"
        "    payId: '0478268399',\n"
        "    amount: 40,\n"
        "    reference: 'b1719567890123',\n"
        "    gst: 3.64,\n"
        "    net: 36.36,\n"
        "    instructions: ['Open your mobile banking app', ...]\n"
        "  }\n"
        "}"
    )

    pdf.h2("Transaction record with GST")
    pdf.code_block(
        "// Inside markBookingPaid — add GST fields\n"
        "const { breakdown } = require('./gst');\n"
        "const b = breakdown(details.amount);\n"
        "transactions.unshift({\n"
        "  id: 't' + Date.now(),\n"
        "  amount: b.total,\n"
        "  gst: b.gst,\n"
        "  net: b.net,\n"
        "  paymentMethod: details.method || 'payid',\n"
        "  // ... existing fields\n"
        "});"
    )

    # 10. Provider comparison
    pdf.add_page()
    pdf.h1("10. Provider Comparison & Costs")
    pdf.table(
        ["Method", "Typical fees", "Auto reconcile", "Dev effort", "Best for"],
        [
            ["Static PayID", "Free (bank transfer)", "Manual", "Done", "Start immediately"],
            ["Azupay PayID", "Per-transaction API pricing", "Yes (webhook)", "Low", "Auto-confirm bookings"],
            ["Monoova PayID", "Per-transaction pricing", "Yes (webhook)", "Medium", "High volume"],
            ["Westpac QuickStream", "Enterprise pricing", "Yes (webhook)", "High", "Large businesses"],
        ],
        [30, 40, 30, 25, 65],
    )

    pdf.h2("Decision matrix")
    pdf.bullet("Static PayID: Best to launch now — free, no contracts, already built into your site")
    pdf.bullet("Azupay: Best when you want bookings auto-confirmed without checking the bank")
    pdf.bullet("Never use Stripe for PayID — use your bank PayID or an NPP specialist directly")

    # 11. Compliance checklist
    pdf.add_page()
    pdf.h1("11. Compliance Checklist")
    pdf.h2("Before accepting PayID payments")
    pdf.bullet("[ ] ABN active and displayed on website/invoices")
    pdf.bullet("[ ] GST registered (if turnover >= $75,000 or voluntarily registered)")
    pdf.bullet("[ ] Business bank account with PayID registered")
    pdf.bullet("[ ] Prices confirmed as GST-inclusive or GST-exclusive (display clearly to customers)")
    pdf.bullet("[ ] Tax invoice template prepared")
    pdf.bullet("[ ] Privacy policy updated if storing payment references")

    pdf.h2("Before go-live on website")
    pdf.bullet("[ ] PayID registered with business bank account")
    pdf.bullet("[ ] PAYID and PAYID_NAME set on Vercel and site redeployed")
    pdf.bullet("[ ] Webhook endpoint tested (POST /api/payments/webhook returns 200)")
    pdf.bullet("[ ] Test booking: correct amount, GST breakdown, confirmation email")
    pdf.bullet("[ ] Admin Finances shows payment with booking link")
    pdf.bullet("[ ] Cancelled/unpaid booking flow still works")

    pdf.h2("Each BAS period")
    pdf.bullet("[ ] Export sales from admin or accounting software")
    pdf.bullet("[ ] Verify G1 total matches bank PayID deposits")
    pdf.bullet("[ ] Calculate 1A (GST collected) — use total taxable sales / 11 if all prices inclusive")
    pdf.bullet("[ ] Gather expense receipts for 1B (GST credits)")
    pdf.bullet("[ ] Lodge BAS by due date (28th of month after quarter end for quarterly lodgers)")

    # 12. Resources
    pdf.add_page()
    pdf.h1("12. Official Resources & Links")
    pdf.table(
        ["Resource", "URL"],
        [
            ["ATO — Register for GST", "business.gov.au/registrations/register-for-taxes/register-for-goods-and-services-tax-gst"],
            ["ATO — Tax invoices", "ato.gov.au/businesses-and-organisations/gst-excise-and-indirect-taxes/gst/tax-invoices"],
            ["business.gov.au — How to invoice", "business.gov.au/finance/payments-and-invoicing/how-to-invoice"],
            ["Azupay PayID developer docs", "developer.azupay.com.au/docs/receive-payid-payments"],
            ["Westpac QuickStream PayID", "quickstream.westpac.com.au/docs/payid"],
            ["NPP Australia (PayID)", "nppa.com.au/payid"],
            ["Your PayID setup guide", "PAYID-SETUP.txt in project root"],
        ],
        [70, 120],
    )

    pdf.h1("13. Support & Next Steps")
    pdf.body(
        "Your website is configured for PayID only — no Stripe. Start with static PayID "
        "(register with your bank, add PAYID to Vercel), then add Azupay if you want automatic confirmation."
    )
    pdf.h2("Suggested immediate actions")
    pdf.bullet("1. Confirm your ABN and GST registration status with your accountant")
    pdf.bullet("2. Register PayID on your business bank account (mobile or email)")
    pdf.bullet("3. Add PAYID=0478268399 and PAYID_NAME to Vercel environment variables")
    pdf.bullet("4. Remove any STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET from Vercel")
    pdf.bullet("5. Redeploy and test a booking — PayID instructions should appear")

    pdf.ln(10)
    pdf.set_font("Helvetica", "I", 9)
    pdf.set_text_color(100, 100, 100)
    pdf.multi_cell(
        0,
        5,
        safe(
            "Document generated for Jack's Barber Style - 47 O'Meara Street, Wodonga VIC 3690. "
            "For setup steps see PAYID-SETUP.txt in the project root."
        ),
    )

    pdf.output(str(OUTPUT))
    print(f"Created: {OUTPUT}")


if __name__ == "__main__":
    build()
