# app/schema.py
"""
Defines required and optional fields for each intent.
Used by /generate endpoint and merged into /intents responses.
"""

SCHEMA = {
    "quote_request": {
        "required": ["companyName", "item", "quantity", "destination"],
        "optional": ["deliveryDate", "contactPerson", "notes"],
    },
    "shipment_update": {
        "required": ["trackingNumber", "carrier", "shipDate"],
        "optional": ["estimatedArrival", "orderNumber", "notes"],
    },
    "qb_order": {
        "label": "QB Order",
        "description": "QuickBooks order request.",
        "required": ["recipientName"],
        "optional": [],
    },
    "order_confirmation": {
        "required": ["orderNumber", "companyName", "deliveryDate"],
        "optional": ["items", "trackingNumber", "notes"],
    },
    "invoice_payment": {
        "required": ["invoiceNumber", "amount", "paymentDate"],
        "optional": ["method", "notes"],
    },
    "delay_notice": {
        "required": ["reason"],
        "optional": ["previousShip", "newShip", "recipientName", "poNumber", "partNumber"],
    },
    "packing_slip_docs": {
        "required": ["documentType", "orderNumber"],
        "optional": ["attachment", "notes"],
    },
    "followup": {
        "required": ["topic", "recipientName"],
        "optional": ["previousDate", "notes"],
    },
    # Auto detect pseudo-intent (no fields; handled in main.py)
    "auto_detect": {
        "required": [],
    },
    "invoice_po_followup": {
        "required": ["recipientName", "invoiceNumber", "poNumber", "dueDate"],
    },
    "tax_exemption": {
        "required": ["recipientName"],
    },
    "order_request": {
        "label": "Order Request",
        "description": "Request to process and confirm an order with shipping details.",
        "required": ["recipientName", "parts", "fedexAccount", "shipAddress"],
        "optional": ["notes"],
        # New: backend-driven dropdowns per field
        "choices": {
            "fedexAccount": [
                {"label": "MEXICALI/COMPLETIONS",          "value": "031400023"},
                {"label": "EDWARDS",                       "value": "240920760"},
                {"label": "DALLAS/FORTH WORTH",            "value": "228448800"},
                {"label": "SPARES/RDCFP (INNOVATION DR)",  "value": "805079878"},
                {"label": "APPLETON",                      "value": "054900023"},
                {"label": "CAHOKIA",                       "value": "335312570"},
                {"label": "ELISE ST",                      "value": "161038032"},
                {"label": "WEST PALM BEACH",               "value": "231190686"},
                {"label": "BRUNSWICK",                     "value": "158314215"},
                {"label": "MESA",                          "value": "323701300"},
                {"label": "GILL CORP",                     "value": "091536978"}
            ]
    },
},


}

# Merge optional fields into required for all intents
for name, data in SCHEMA.items():
    req = set(data.get("required", []))
    opt = set(data.get("optional", []))
    data["required"] = sorted(req | opt)  # union of both
    data["optional"] = []  # clear optional list

# Backend-controlled date fields per intent (UI will use this to decide <input type="date">)
DATE_FIELDS_MAP = {
    "quote_request":       ["deliveryDate"],
    "shipment_update":     ["shipDate", "estimatedArrival"],
    "qb_order":            ["orderDate", "shipDate"],
    "order_confirmation":  ["deliveryDate"],
    "invoice_payment":     ["paymentDate"],
    "delay_notice":        ["newDate"],
    "packing_slip_docs":   [],
    "followup":            ["previousDate"],
    "auto_detect":         [],
    "invoice_po_followup": ["dueDate"],
    "tax_exemption":       [],
    # Add future intents here, e.g.:
    # "order_request":    ["requestedShipDate"]
}

# Merge the map into SCHEMA without touching each entry above
for name, fields in DATE_FIELDS_MAP.items():
    if name in SCHEMA:
        SCHEMA[name].setdefault("date_fields", [])
        SCHEMA[name]["date_fields"] = sorted(set(SCHEMA[name]["date_fields"]) | set(fields))

# Optional: ensure every intent has the key
for data in SCHEMA.values():
    data.setdefault("date_fields", [])

# Optional: for reference or validation
INTENT_NAMES = list(SCHEMA.keys())



# Optional: for reference or validation
INTENT_NAMES = list(SCHEMA.keys())



# Adding drop downs:
# "choices": {
#     "someField": [
#         {"label": "Shown to user", "value": "goes-to-email-or-api"}
#     ]
# }

