# AUTO-GENERATED FILE — DO NOT EDIT.
SCHEMA_GENERATED = {
  "auto_detect": {
    "description": "Auto-detect intent from text.",
    "enums": {},
    "fieldTypes": {},
    "hints": {},
    "industry": "Registry",
    "label": "Auto Detect",
    "optional": [],
    "required": [],
    "template": {
      "bodyPath": "",
      "subject": ""
    }
  },
  "delay_notice": {
    "description": "Notify a customer that a purchase order\u2019s shipping schedule has changed.",
    "enums": {},
    "fieldTypes": {
      "customerName": "string",
      "newShip": "date",
      "partNumber": "string",
      "poNumber": "string",
      "previousShip": "date",
      "reason": "longtext"
    },
    "hints": {
      "customerName": "e.g., John Smith",
      "newShip": "updated ship date",
      "partNumber": "e.g., 28-4752-09A",
      "poNumber": "e.g., PO-10927",
      "previousShip": "previous confirmed ship date",
      "reason": "e.g., supplier delay, weather, production hold"
    },
    "industry": "Registry",
    "label": "Delay Notice",
    "optional": [],
    "required": [
      "poNumber",
      "partNumber",
      "customerName",
      "reason",
      "previousShip",
      "newShip"
    ],
    "template": {
      "bodyPath": "templates/delay_notice.j2",
      "subject": "Schedule Update \u2013 PO {{ poNumber }} / {{ partNumber }}"
    }
  },
  "followup": {
    "description": "Send a short follow-up or status-check message on a prior topic.",
    "enums": {},
    "fieldTypes": {
      "context": "longtext",
      "customerName": "string"
    },
    "hints": {
      "context": "e.g., \"the quote for PO-10927\" or \"yesterday\u2019s delivery timing\"",
      "customerName": "e.g., \"John Smith\""
    },
    "industry": "Registry",
    "label": "Follow-up",
    "optional": [],
    "required": [
      "customerName",
      "context"
    ],
    "template": {
      "bodyPath": "templates/followup.j2",
      "subject": "Follow-up \u2013 {{ context }}"
    }
  },
  "invoice_payment": {
    "description": "Notify or confirm payment for an invoice.",
    "enums": {},
    "fieldTypes": {
      "amount": "string",
      "invoiceNumber": "string",
      "paymentDate": "date",
      "paymentMethod": "string",
      "recipientName": "string"
    },
    "hints": {
      "amount": "e.g., 420.00 USD",
      "invoiceNumber": "e.g., INV-4827",
      "paymentDate": "mm/dd/yyyy",
      "paymentMethod": "e.g., ACH, Check, Credit Card",
      "recipientName": "e.g., John Smith"
    },
    "industry": "Registry",
    "label": "Invoice Payment",
    "optional": [],
    "required": [
      "recipientName",
      "invoiceNumber",
      "amount",
      "paymentMethod",
      "paymentDate"
    ],
    "template": {
      "bodyPath": "templates/invoice_payment.j2",
      "subject": "Payment Remittance \u2013 Invoice {{ invoiceNumber }}"
    }
  },
  "invoice_po_followup": {
    "description": "Follow up on an invoice or purchase order previously sent or discussed.",
    "enums": {},
    "fieldTypes": {
      "dueDate": "date",
      "invoiceNumber": "string",
      "poNumber": "string",
      "recipientName": "string"
    },
    "hints": {
      "dueDate": "mm/dd/yyyy",
      "invoiceNumber": "e.g., INV-4827",
      "poNumber": "e.g., PO-10892",
      "recipientName": "e.g., John Smith"
    },
    "industry": "Registry",
    "label": "Invoice / PO Follow-Up",
    "optional": [],
    "required": [
      "recipientName",
      "invoiceNumber",
      "poNumber",
      "dueDate"
    ],
    "template": {
      "bodyPath": "templates/invoice_po_followup.j2",
      "subject": "Follow-Up on Invoice {{ invoiceNumber }} / PO {{ poNumber }} \u2014 Due {{ dueDate }}"
    }
  },
  "order_confirmation": {
    "description": "Confirm that an order has been received and provide delivery details.",
    "enums": {},
    "fieldTypes": {
      "itemsSummary": "longtext",
      "poNumber": "string",
      "promisedShip": "date",
      "recipientName": "string"
    },
    "hints": {
      "itemsSummary": "e.g., 10 \u00d7 Part A, 5 \u00d7 Part B",
      "poNumber": "e.g., PO-10832",
      "promisedShip": "mm/dd/yyyy",
      "recipientName": "e.g., John Smith"
    },
    "industry": "Registry",
    "label": "Order Confirmation",
    "optional": [],
    "required": [
      "recipientName",
      "poNumber",
      "itemsSummary",
      "promisedShip"
    ],
    "template": {
      "bodyPath": "templates/order_confirmation.j2",
      "subject": "Order Confirmation \u2013 PO {{ poNumber }}"
    }
  },
  "order_request": {
    "description": "Request to process and confirm an order with shipping details.",
    "enums": {
      "fedexAccount": [
        {
          "label": "MEXICALI/COMPLETIONS",
          "value": "031400023"
        },
        {
          "label": "EDWARDS",
          "value": "240920760"
        },
        {
          "label": "DALLAS/FORTH WORTH",
          "value": "228448800"
        },
        {
          "label": "SPARES/RDCFP (INNOVATION DR)",
          "value": "805079878"
        },
        {
          "label": "APPLETON",
          "value": "054900023"
        },
        {
          "label": "CAHOKIA",
          "value": "335312570"
        },
        {
          "label": "ELISE ST",
          "value": "161038032"
        },
        {
          "label": "WEST PALM BEACH",
          "value": "231190686"
        },
        {
          "label": "BRUNSWICK",
          "value": "158314215"
        },
        {
          "label": "MESA",
          "value": "323701300"
        },
        {
          "label": "GILL CORP",
          "value": "091536978"
        }
      ]
    },
    "fieldTypes": {
      "fedexAccount": "enum",
      "notes": "longtext",
      "parts": "longtext",
      "recipientName": "string",
      "shipAddress": "longtext"
    },
    "hints": {
      "fedexAccount": "Select shipper account number",
      "fedexAccountLabels": "{\n  \"031400023\": \"MEXICALI/COMPLETIONS\",\n  \"240920760\": \"EDWARDS\",\n  \"228448800\": \"DALLAS/FORTH WORTH\",\n  \"805079878\": \"SPARES/RDCFP (INNOVATION DR)\",\n  \"054900023\": \"APPLETON\",\n  \"335312570\": \"CAHOKIA\",\n  \"161038032\": \"ELISE ST\",\n  \"231190686\": \"WEST PALM BEACH\",\n  \"158314215\": \"BRUNSWICK\",\n  \"323701300\": \"MESA\",\n  \"091536978\": \"GILL CORP\"\n}\n",
      "notes": "Optional special instructions or comments",
      "parts": "List PN and qty lines",
      "recipientName": "e.g., \"UP Aviation Receiving\"",
      "shipAddress": "Full street, city, state, zip"
    },
    "industry": "Registry",
    "label": "Order Request",
    "optional": [
      "notes"
    ],
    "required": [
      "recipientName",
      "parts",
      "fedexAccount",
      "shipAddress"
    ],
    "template": {
      "bodyPath": "templates/order_request.j2",
      "subject": "Order Request \u2013 {{ recipientName }}"
    }
  },
  "packing_slip_docs": {
    "description": "Send or request documentation such as a packing slip, invoice, or certificate.",
    "enums": {},
    "fieldTypes": {
      "customerName": "string",
      "docsList": "longtext",
      "notes": "longtext",
      "poNumber": "string"
    },
    "hints": {
      "customerName": "e.g., John Smith",
      "docsList": "e.g., \"Packing Slip, Invoice, CoC\"",
      "notes": "Optional internal note or context",
      "poNumber": "e.g., PO-10922"
    },
    "industry": "Registry",
    "label": "Packing Slip / Documents",
    "optional": [],
    "required": [
      "customerName",
      "poNumber",
      "docsList"
    ],
    "template": {
      "bodyPath": "templates/packing_slip_docs.j2",
      "subject": "Documents for PO {{ poNumber }}"
    }
  },
  "qb_order": {
    "description": "QuickBooks order request or confirmation message.",
    "enums": {},
    "fieldTypes": {
      "poNumber": "string",
      "recipientName": "string"
    },
    "hints": {
      "poNumber": "e.g., PO-10941",
      "recipientName": "e.g., \"UP Aviation Accounting\""
    },
    "industry": "Registry",
    "label": "QB Order",
    "optional": [],
    "required": [
      "recipientName",
      "poNumber"
    ],
    "template": {
      "bodyPath": "templates/qb_order.j2",
      "subject": "New Order // {{ poNumber }}"
    }
  },
  "quote_request": {
    "description": "Request pricing and lead time for a specific part and quantity.",
    "enums": {},
    "fieldTypes": {
      "customerName": "string",
      "needByDate": "date",
      "notes": "longtext",
      "partNumber": "string",
      "quantity": "string"
    },
    "hints": {
      "customerName": "e.g., \"John Smith\"",
      "needByDate": "mm/dd/yyyy (optional target date)",
      "notes": "Optional context or constraints (e.g., MOQs, alt parts)",
      "partNumber": "e.g., \"PN-10423\"",
      "quantity": "e.g., \"2\""
    },
    "industry": "Registry",
    "label": "Quote Request",
    "optional": [
      "needByDate",
      "notes"
    ],
    "required": [
      "customerName",
      "partNumber",
      "quantity"
    ],
    "template": {
      "bodyPath": "templates/quote_request.j2",
      "subject": "Pricing & Lead Time Request \u2013 {{ partNumber }} (Qty {{ quantity }})"
    }
  },
  "shipment_update": {
    "description": "Notify a customer about shipment or tracking status.",
    "enums": {
      "carrier": [
        {
          "label": "UPS",
          "value": "UPS"
        },
        {
          "label": "FedEx",
          "value": "FedEx"
        },
        {
          "label": "DHL",
          "value": "DHL"
        },
        {
          "label": "USPS",
          "value": "USPS"
        },
        {
          "label": "Maersk",
          "value": "Maersk"
        },
        {
          "label": "MSC",
          "value": "MSC"
        },
        {
          "label": "CMA CGM",
          "value": "CMA CGM"
        },
        {
          "label": "Hapag-Lloyd",
          "value": "Hapag-Lloyd"
        },
        {
          "label": "Other (Specify)",
          "value": "Other (Specify)"
        }
      ]
    },
    "fieldTypes": {
      "carrier": "enum",
      "carrierOther": "string",
      "customerName": "string",
      "items": "longtext",
      "notes": "longtext",
      "poNumber": "string",
      "shipDate": "date",
      "trackingNumber": "string"
    },
    "hints": {
      "carrier": "Choose a listed carrier or 'Other (Specify)'",
      "carrierOther": "If 'Other (Specify)', enter the carrier name here",
      "customerName": "e.g., John Smith",
      "items": "Optional \u2013 brief list or summary of shipped parts",
      "notes": "Optional internal comments or context",
      "poNumber": "e.g., PO-4815",
      "shipDate": "mm/dd/yyyy",
      "trackingNumber": "e.g., 1Z999AA10123456784"
    },
    "industry": "Registry",
    "label": "Shipment Update",
    "optional": [
      "carrierOther",
      "notes"
    ],
    "required": [
      "customerName",
      "poNumber",
      "items",
      "carrier",
      "trackingNumber",
      "shipDate"
    ],
    "template": {
      "bodyPath": "templates/shipment_update.j2",
      "subject": "Tracking \u2013 PO {{ poNumber }} (Shipped {{ shipDate }})"
    }
  },
  "tax_exemption": {
    "description": "Notify a customer about tax-exempt status or send a tax-exempt certificate.",
    "enums": {},
    "fieldTypes": {
      "recipientName": "string"
    },
    "hints": {
      "recipientName": "e.g., \"Accounts Payable\""
    },
    "industry": "Registry",
    "label": "Tax Exemption",
    "optional": [],
    "required": [
      "recipientName"
    ],
    "template": {
      "bodyPath": "templates/tax_exemption.j2",
      "subject": "Tax Exempt Certificate Attached"
    }
  }
}
