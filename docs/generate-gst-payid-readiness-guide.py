#!/usr/bin/env python3
"""Generate Jack's Barber Style GST Registration & PayID Readiness Guide PDF."""

from fpdf import FPDF
from pathlib import Path

OUTPUT = (
    Path(__file__).resolve().parent
    / "Jacks-Barber-Style-GST-Registration-and-PayID-Readiness-Guide.pdf"
)


def safe(text):
    if not isinstance(text, str):
        text = str(text)
    return (
        text.replace("\u2014", "-")
        .replace("\u2013", "-")
        .replace("\u2192", "->")
        .replace("\u2265", ">=")
        .replace("\u2022", "-")
        .replace("\u2610", "[ ]")
        .replace("\u2019", "'")
        .replace("\u2018", "'")
        .replace("\u00b7", "-")
    )


class GuidePDF(FPDF):
    def header(self):
        if self.page_no() == 1:
            return
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(100, 100, 100)
        self.cell(0, 8, safe("Jack's Barber Style - GST & PayID Readiness Guide"), align="C")
        self.ln(4)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 10, f"Page {self.page_no()}", align="C")

    def cover(self):
        self.add_page()
        self.set_font("Helvetica", "B", 26)
        self.set_text_color(30, 30, 30)
        self.ln(28)
        self.multi_cell(0, 12, safe("Jack's Barber Style"), align="C")
        self.ln(4)
        self.set_font("Helvetica", "B", 18)
        self.multi_cell(0, 10, safe("GST Registration & PayID Readiness Guide"), align="C")
        self.ln(8)
        self.set_font("Helvetica", "", 12)
        self.set_text_color(70, 70, 70)
        self.multi_cell(0, 7, safe("Version 1.0 - June 2026 - For owner, bookkeeper & website setup"), align="C")
        self.ln(6)
        self.set_font("Helvetica", "", 11)
        self.multi_cell(0, 6, safe("47 O'Meara Street, Wodonga VIC 3690"), align="C")
        self.ln(18)
        self.set_font("Helvetica", "I", 9)
        self.set_text_color(120, 120, 120)
        self.multi_cell(
            0,
            5,
            safe(
                "Important: This document is general guidance for a small Australian barber business. "
                "It is not legal or tax advice. Confirm your obligations with a qualified accountant "
                "or tax agent based on your business structure (sole trader, partnership, company, etc.)."
            ),
            align="C",
        )

    def h1(self, text):
        self.ln(3)
        self.set_font("Helvetica", "B", 14)
        self.set_text_color(20, 20, 20)
        self.multi_cell(0, 8, safe(text))
        self.ln(2)
        self.set_draw_color(180, 140, 60)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(4)

    def h2(self, text):
        self.ln(2)
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(40, 40, 40)
        self.multi_cell(0, 6, safe(text))
        self.ln(2)

    def body(self, text):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(30, 30, 30)
        self.multi_cell(0, 5.5, safe(text))
        self.ln(2)

    def bullet(self, text):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(30, 30, 30)
        self.cell(6, 5.5, "-")
        self.multi_cell(0, 5.5, safe(text))
        self.ln(1)

    def check(self, text):
        self.set_font("Helvetica", "", 10)
        self.cell(8, 5.5, "[ ]")
        self.multi_cell(0, 5.5, safe(text))
        self.ln(1)

    def table(self, headers, rows, col_widths):
        self.set_font("Helvetica", "B", 9)
        self.set_fill_color(240, 235, 225)
        for i, h in enumerate(headers):
            self.cell(col_widths[i], 7, safe(h), border=1, fill=True)
        self.ln()
        self.set_font("Helvetica", "", 9)
        for row in rows:
            y0 = self.get_y()
            if y0 > 250:
                self.add_page()
                y0 = self.get_y()
            x0 = self.get_x()
            row_h = 7
            for i, cell in enumerate(row):
                lines = self.multi_cell(col_widths[i], 5, safe(str(cell)), dry_run=True, output="LINES")
                h = max(7, len(lines) * 5)
                if h > row_h:
                    row_h = h
            for i, cell in enumerate(row):
                x = x0 + sum(col_widths[:i])
                self.set_xy(x, y0)
                self.multi_cell(col_widths[i], 5, safe(str(cell)), border=1)
            self.set_xy(x0, y0 + row_h)
        self.ln(3)

    def flow(self, lines):
        self.set_x(10)
        self.set_font("Helvetica", "", 10)
        for line in lines:
            if self.get_y() > 260:
                self.add_page()
            self.set_x(10)
            self.multi_cell(0, 5.5, safe(line))
        self.ln(2)


def build():
    pdf = GuidePDF()
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.cover()

    # 1. Purpose
    pdf.add_page()
    pdf.h1("1. Purpose")
    pdf.body(
        "This guide explains what Jack's Barber Style needs after registering for GST (or while "
        "preparing to register) before accepting PayID and bank transfer (EFT) payments for online "
        "bookings on the website."
    )
    pdf.body(
        "GST registration and PayID are separate steps:\n"
        "GST - how you report tax to the ATO\n"
        "PayID - how client payments arrive in your business bank account"
    )
    pdf.body(
        "PayID does not calculate or deduct GST. Your tax invoices, bookkeeping, and BAS "
        "(Business Activity Statement) do."
    )
    pdf.body(
        "Related document: PAYID-SETUP.txt (project root) and docs/PayID-GST-Integration-Guide-Jacks-Barber-Style.pdf"
    )

    # 2. GST account clarification
    pdf.h1("2. What is a GST account? (Clarification)")
    pdf.body(
        "In Australia you do not receive a separate GST account number from the ATO. When people "
        "say GST account they usually mean one or more of the following:"
    )
    pdf.bullet("GST registration linked to your ABN")
    pdf.bullet("Your business bank account (where PayID payments land)")
    pdf.bullet("Internal bookkeeping to track GST collected and owed")
    pdf.body(
        "For PayID on your website you need all three set up correctly - but only one actual bank account."
    )

    # 3. GST registration details
    pdf.h1("3. What you get from GST registration (ATO / ABN)")
    pdf.body("After registering for GST, record and use these details on invoices, receipts, and the website:")
    pdf.table(
        ["Item", "Why you need it"],
        [
            ["Legal / trading name", "Exact spelling on tax invoices (Jack's Barber Style)"],
            ["ABN", "Required on tax invoices; can also be used as your PayID"],
            ["GST registration start date", "When you must start charging or showing GST correctly"],
            ["Accounting basis", "Cash or Accrual - affects when GST is reported on your BAS"],
            ["BAS lodgement cycle", "Usually quarterly (sometimes monthly or annual)"],
            ["GST reporting method", "Usually Simpler BAS for turnover under $10 million"],
            ["Business address", "47 O'Meara Street, Wodonga VIC 3690"],
            ["Contact email / phone", "Jacqueskatumbulu@gmail.com / 0478 268 399"],
        ],
        [55, 135],
    )

    # 4. Bank setup
    pdf.add_page()
    pdf.h1("4. What you need from your bank (for PayID)")
    pdf.body("Set up on your business bank account - not a personal account:")
    pdf.table(
        ["Bank detail", "Purpose"],
        [
            ["Account name", "Must match your business name (Jack's Barber Style)"],
            ["BSB + account number", "Backup if a client pays by standard EFT instead of PayID"],
            ["PayID", "Instant payments - commonly your ABN, mobile, or business email"],
            ["Business transaction account", "Correct account type for a sole trader or small company"],
        ],
        [55, 135],
    )
    pdf.body(
        "Recommended PayID options for this business:\n"
        "- Mobile: 0478268399\n"
        "- Email: Jacqueskatumbulu@gmail.com\n"
        "- ABN (once registered for GST)"
    )
    pdf.body(
        "Money goes directly to your business account. No Stripe, PayPal, or card processor is required. "
        "Optional: Azupay can auto-confirm payments via webhook (see PAYID-SETUP.txt)."
    )

    # 5. Accountant questions
    pdf.h1("5. Questions for your accountant (before going live)")
    pdf.body("Confirm these before showing GST amounts on the website:")
    pdf.bullet("Should Jack's Barber Style register for GST? (Turnover of $75,000+ generally requires registration.)")
    pdf.bullet("Are barber and hairdressing services GST-taxable? (Generally yes for commercial barbers.)")
    pdf.bullet("Is the home service travel fee ($15) a separate taxable supply or part of the service?")
    pdf.bullet("Should website prices be GST-inclusive or GST-exclusive?")
    pdf.body(
        "Example inclusive (recommended for clients): Skin Fade $40 total ($36.36 + $3.64 GST)\n"
        "Example exclusive: $36.36 + $5.00 GST = $40.00 total"
    )
    pdf.bullet("Do we need a formal tax invoice for every paid booking?")
    pdf.bullet("Are we reporting on a cash or accrual basis?")
    pdf.bullet("Can we use Simpler BAS given our expected turnover?")

    # 6. Receipt / tax invoice
    pdf.h1("6. What to show on every receipt / tax invoice")
    pdf.body("Once GST-registered, each receipt or tax invoice should include:")
    pdf.check("Business name: Jack's Barber Style")
    pdf.check("ABN")
    pdf.check("Tax invoice wording (when required by ATO)")
    pdf.check("Unique invoice / receipt number (e.g. JBS-INV-2026-0042)")
    pdf.check("Date of issue")
    pdf.check("Client name and email")
    pdf.check("Description (e.g. Skin Fade - in-shop, 15 Jun 2026 10:00 AM)")
    pdf.check("Service amount and GST component (if applicable)")
    pdf.check("Total amount paid")
    pdf.check('GST note: "Total price includes GST" or GST amount shown separately')
    pdf.check("Payment method (PayID / EFT)")
    pdf.check("Payment reference used by the client (e.g. b1719567890123)")

    pdf.h2("Sample layout")
    pdf.set_font("Courier", "", 8)
    pdf.set_fill_color(252, 250, 245)
    sample = (
        "TAX INVOICE\n"
        "Jack's Barber Style\n"
        "47 O'Meara Street, Wodonga VIC 3690\n"
        "ABN: [Your ABN]  |  Phone: 0478 268 399\n\n"
        "Invoice #: JBS-INV-2026-0042     Date: 28/06/2026\n"
        "Booking ref: b1719567890123\n\n"
        "Bill to: John Smith  |  john@example.com\n\n"
        "Skin Fade - in-shop on 15/06/2026 at 10:00 AM    $40.00\n"
        "Subtotal (ex GST)                                  $36.36\n"
        "GST (10%)                                           $3.64\n"
        "TOTAL (inc GST)                                    $40.00\n\n"
        "Paid via PayID  |  Reference: b1719567890123"
    )
    for line in sample.split("\n"):
        pdf.cell(0, 4.2, "  " + safe(line), fill=True, new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    # 7. Bookkeeping
    pdf.add_page()
    pdf.h1("7. Internal bookkeeping (GST tracking)")
    pdf.body(
        "You do not need a second bank account for GST, but you should track GST in your records:"
    )
    pdf.table(
        ["Ledger / category", "Purpose"],
        [
            ["Service income", "Haircuts and grooming from in-shop bookings"],
            ["Home service income", "Bookings with travel fee (service + $15 travel)"],
            ["GST collected", "10% set aside for the ATO (liability account)"],
            ["Bank fees", "Usually minimal for PayID / EFT"],
            ["Business expenses", "Rent, tools, products - GST credits if GST-registered"],
        ],
        [55, 135],
    )
    pdf.body("For each PayID payment, record:")
    pdf.check("Gross amount received")
    pdf.check("GST portion (total / 11 if price is GST-inclusive)")
    pdf.check("Net income portion")
    pdf.check("Booking reference (matches website booking ID)")
    pdf.check("Date received in bank")
    pdf.check("Who confirmed payment in Staff admin")
    pdf.check("Receipt / invoice number issued")
    pdf.body(
        "This supports your BAS: GST collected on sales minus GST credits on expenses = net GST owed to the ATO."
    )
    pdf.body(
        "The website records paid bookings in Finances (Staff area) and transactions.json with gst and net fields "
        "when GST_REGISTERED=true on Vercel."
    )

    # 8. Payment references
    pdf.h1("8. Payment reference format")
    pdf.body("Unique references help you match bank deposits to bookings:")
    pdf.table(
        ["Type", "Format", "Example"],
        [
            ["In-shop booking", "b + timestamp (auto-generated)", "b1719567890123"],
            ["Home service booking", "Same booking ID", "b1719567890456"],
            ["Manual / phone booking", "Optional prefix JBS-", "JBS-SMITH-150626"],
        ],
        [45, 70, 75],
    )
    pdf.body(
        "Clients must include the booking reference when paying via PayID or EFT. "
        "The website displays this reference automatically after they submit the booking form."
    )

    # 9. Client payment flow
    pdf.add_page()
    pdf.h1("9. Client payment flow (PayID + EFT)")
    pdf.flow([
        "Client visits website and opens Book section (#book on index.html)",
        "-> Selects service (e.g. Skin Fade $40), date, time, in-shop or home service",
        "-> Submits booking form",
        "-> Confirmation shows PayID + exact amount + booking reference + GST (if configured)",
        "-> Client pays from their banking app",
        "-> You see deposit in business account",
        "-> Booking marked Paid (manually in Staff, or automatically via Azupay webhook)",
        "-> Tax invoice / receipt sent to client",
        "-> Appointment status: Confirmed - reminders can send",
    ])
    pdf.h2("Website status")
    pdf.bullet("Live: Online booking, service prices, PayID instructions, Staff admin, Finances, CSV export")
    pdf.bullet("Configured via Vercel: PAYID, PAYID_NAME, BUSINESS_ABN, GST_REGISTERED")
    pdf.bullet("Optional: Azupay for automatic payment confirmation webhook")
    pdf.bullet("Not used: Stripe, card payments, PayPal")

    # 10. Pre-launch checklist
    pdf.add_page()
    pdf.h1("10. Pre-launch checklist")
    pdf.check("ABN active and correct on all documents")
    pdf.check("GST registered (if required or chosen)")
    pdf.check("Accountant confirmed GST treatment for barber services and travel fee")
    pdf.check("Business bank account opened (not personal)")
    pdf.check("PayID enabled and linked (mobile, email, or ABN)")
    pdf.check("BSB + account number ready for EFT backup")
    pdf.check("Invoice / receipt template agreed with accountant")
    pdf.check("Payment reference format understood (website booking ID)")
    pdf.check("Process documented: match bank reference -> mark paid in Staff -> send receipt")
    pdf.check("BAS lodgement dates in calendar (usually quarterly)")
    pdf.check("PAYID and GST_REGISTERED environment variables set on Vercel")
    pdf.check("Test booking completed on live site - PayID panel shows correct amount")
    pdf.check("Old STRIPE_* variables removed from Vercel (if any)")

    # 11. Website integration inputs
    pdf.h1("11. What to provide for website PayID integration")
    pdf.body("Provide these to configure the live site (Vercel environment variables):")
    pdf.bullet("1. Trading name: Jack's Barber Style")
    pdf.bullet("2. ABN")
    pdf.bullet("3. PayID (mobile, email, or ABN as registered with your bank)")
    pdf.bullet("4. BSB and account number (for EFT backup on receipts - optional on site)")
    pdf.bullet("5. Service prices (managed in Staff area - Services list)")
    pdf.bullet("6. Home service travel fee (currently $15 - Staff settings)")
    pdf.bullet("7. GST wording from accountant (GST_REGISTERED=true/false)")
    pdf.bullet("8. Receipt contact email: Jacqueskatumbulu@gmail.com")
    pdf.bullet("9. Site URL: https://jack-barber-rho.vercel.app")

    pdf.h2("Vercel environment variables")
    pdf.table(
        ["Variable", "Example", "Required"],
        [
            ["PAYID", "0478268399", "Yes"],
            ["PAYID_NAME", "Jack's Barber Style", "Yes"],
            ["SITE_URL", "https://jack-barber-rho.vercel.app", "Yes"],
            ["BUSINESS_ABN", "XX XXX XXX XXX", "For tax invoices"],
            ["GST_REGISTERED", "true", "If GST-registered"],
            ["AZUPAY_CLIENT_ID", "(from Azupay)", "Optional"],
            ["AZUPAY_SECRET", "(from Azupay)", "Optional"],
        ],
        [50, 75, 65],
    )

    # 12. Service prices & GST examples
    pdf.h1("12. Current service prices (GST-inclusive examples)")
    pdf.body("If GST-registered and prices include GST, the GST portion is total / 11:")
    pdf.table(
        ["Service", "Price (inc GST)", "GST (1/11)", "Ex-GST"],
        [
            ["Skin Fade", "$40.00", "$3.64", "$36.36"],
            ["Afro Cut", "$45.00", "$4.09", "$40.91"],
            ["Twists & Retwist", "$50.00", "$4.55", "$45.45"],
            ["Beard Trim & Shape", "$25.00", "$2.27", "$22.73"],
            ["Home travel fee", "$15.00", "$1.36", "$13.64"],
        ],
        [48, 47, 47, 48],
    )

    # 13. Security reminders
    pdf.h1("13. Security & business reminders")
    pdf.bullet("Never use a personal bank account for business bookings")
    pdf.bullet("Publish PayID and bank details only on your official website")
    pdf.bullet("Keep a ledger: booking ID, client name, amount, date, method, who confirmed")
    pdf.bullet("Reconcile bank statement monthly against Staff Finances export")
    pdf.bullet("Keep tax invoices and payment records for at least 5 years (ATO requirement)")
    pdf.bullet("Home service: confirm address and travel fee before marking booking confirmed")

    # 14. Related documents
    pdf.h1("14. Related documents (project folder)")
    pdf.bullet("PAYID-SETUP.txt - Vercel and PayID configuration steps")
    pdf.bullet("docs/PayID-GST-Integration-Guide-Jacks-Barber-Style.pdf - Technical integration reference")
    pdf.bullet("LIVE-BOOKINGS-SETUP.txt - Booking system setup")
    pdf.bullet("REMINDERS-SETUP.txt - Email/SMS reminder configuration")

    pdf.ln(8)
    pdf.set_font("Helvetica", "I", 9)
    pdf.set_text_color(100, 100, 100)
    pdf.multi_cell(
        0,
        5,
        safe(
            "Jack's Barber Style - Wodonga - African Hair Specialists\n"
            "June 2026 - For business owner review only. Not legal or tax advice."
        ),
        align="C",
    )

    pdf.output(str(OUTPUT))
    print(f"Created: {OUTPUT}")


if __name__ == "__main__":
    build()
