# AUTO-GENERATED FILE — DO NOT EDIT.
SCHEMA_GENERATED = {
  "aerospace_mro_order_confirmation": {
    "description": "Confirm receipt of a purchase order and summarize key details.",
    "enums": {
      "tone": [
        {
          "label": "neutral",
          "value": "neutral"
        },
        {
          "label": "polite",
          "value": "polite"
        },
        {
          "label": "formal",
          "value": "formal"
        }
      ]
    },
    "fieldTypes": {
      "customerName": "string",
      "estimatedShip": "date",
      "notes": "longtext",
      "partNumber": "string",
      "poNumber": "string",
      "quantity": "number",
      "tone": "enum"
    },
    "hints": {
      "estimatedShip": "expected ship date",
      "partNumber": "e.g., 28-4752-09A",
      "poNumber": "e.g., PO-10927"
    },
    "industry": "Aerospace & MRO",
    "label": "Order Confirmation",
    "optional": [
      "estimatedShip",
      "notes",
      "tone"
    ],
    "required": [
      "customerName",
      "poNumber",
      "partNumber",
      "quantity"
    ],
    "template": {
      "bodyPath": "templates/aerospace_mro/aerospace_mro_order_confirmation.j2",
      "subject": "Subject \u2014 {{ field1 }}"
    }
  },
  "aerospace_mro_order_request": {
    "description": "Submit a formal purchase order for aircraft parts or MRO services.",
    "enums": {
      "tone": [
        {
          "label": "neutral",
          "value": "neutral"
        },
        {
          "label": "polite",
          "value": "polite"
        },
        {
          "label": "formal",
          "value": "formal"
        }
      ]
    },
    "fieldTypes": {
      "accountNumber": "string",
      "carrier": "string",
      "customerName": "string",
      "neededBy": "date",
      "notes": "longtext",
      "partNumber": "string",
      "poNumber": "string",
      "quantity": "number",
      "shipTo": "string",
      "tone": "enum"
    },
    "hints": {
      "accountNumber": "customer carrier account",
      "carrier": "e.g., FedEx, UPS, DHL",
      "customerName": "e.g., John Smith",
      "notes": "handling or packaging instructions",
      "partNumber": "e.g., 28-4752-09A",
      "poNumber": "e.g., PO-10927",
      "shipTo": "full address or code"
    },
    "industry": "Aerospace & MRO",
    "label": "Order Request",
    "optional": [
      "neededBy",
      "carrier",
      "accountNumber",
      "notes",
      "tone"
    ],
    "required": [
      "customerName",
      "poNumber",
      "partNumber",
      "quantity",
      "shipTo"
    ],
    "template": {
      "bodyPath": "templates/aerospace_mro/aerospace_mro_order_request.j2",
      "subject": "Subject \u2014 {{ field1 }}"
    }
  },
  "aerospace_mro_quote_request": {
    "description": "Request pricing and lead time for aircraft parts or repair services.",
    "enums": {
      "tone": [
        {
          "label": "neutral",
          "value": "neutral"
        },
        {
          "label": "polite",
          "value": "polite"
        },
        {
          "label": "formal",
          "value": "formal"
        }
      ]
    },
    "fieldTypes": {
      "customerName": "string",
      "incoterms": "string",
      "neededBy": "date",
      "notes": "longtext",
      "partNumber": "string",
      "quantity": "number",
      "tone": "enum"
    },
    "hints": {
      "customerName": "e.g., John Smith",
      "incoterms": "e.g., EXW, FOB",
      "neededBy": "target delivery date",
      "notes": "special conditions or alternates",
      "partNumber": "e.g., 28-4752-09A",
      "quantity": "e.g., 2"
    },
    "industry": "Aerospace & MRO",
    "label": "Quote Request",
    "optional": [
      "neededBy",
      "incoterms",
      "notes",
      "tone"
    ],
    "required": [
      "customerName",
      "partNumber",
      "quantity"
    ],
    "template": {
      "bodyPath": "templates/aerospace_mro/aerospace_mro_quote_request.j2",
      "subject": "Subject \u2014 {{ field1 }}"
    }
  },
  "aerospace_mro_return_authorization": {
    "description": "Request an RMA for returning a shipped part, including reason and condition.",
    "enums": {
      "tone": [
        {
          "label": "neutral",
          "value": "neutral"
        },
        {
          "label": "polite",
          "value": "polite"
        },
        {
          "label": "formal",
          "value": "formal"
        }
      ]
    },
    "fieldTypes": {
      "condition": "string",
      "customerName": "string",
      "invoiceNumber": "string",
      "notes": "longtext",
      "partNumber": "string",
      "photosLink": "string",
      "poNumber": "string",
      "quantity": "number",
      "reason": "longtext",
      "tone": "enum"
    },
    "hints": {
      "condition": "e.g., unopened, installed, used",
      "reason": "e.g., damage, incorrect part, performance issue"
    },
    "industry": "Aerospace & MRO",
    "label": "Return Authorization",
    "optional": [
      "poNumber",
      "invoiceNumber",
      "condition",
      "photosLink",
      "notes",
      "tone"
    ],
    "required": [
      "customerName",
      "partNumber",
      "quantity",
      "reason"
    ],
    "template": {
      "bodyPath": "templates/aerospace_mro/aerospace_mro_return_authorization.j2",
      "subject": "Subject \u2014 {{ field1 }}"
    }
  },
  "aerospace_mro_specification_request": {
    "description": "Request drawings, certifications, or technical specifications for an aircraft part.",
    "enums": {
      "tone": [
        {
          "label": "neutral",
          "value": "neutral"
        },
        {
          "label": "polite",
          "value": "polite"
        },
        {
          "label": "formal",
          "value": "formal"
        }
      ]
    },
    "fieldTypes": {
      "customerName": "string",
      "docType": "string",
      "neededBy": "date",
      "notes": "longtext",
      "partNumber": "string",
      "tone": "enum"
    },
    "hints": {
      "docType": "e.g., C of C, 8130, drawing",
      "neededBy": "target date",
      "partNumber": "e.g., 28-4752-09A"
    },
    "industry": "Aerospace & MRO",
    "label": "Specification Request",
    "optional": [
      "docType",
      "neededBy",
      "notes",
      "tone"
    ],
    "required": [
      "customerName",
      "partNumber"
    ],
    "template": {
      "bodyPath": "templates/aerospace_mro/aerospace_mro_specification_request.j2",
      "subject": "Subject \u2014 {{ field1 }}"
    }
  },
  "auto_detect": {
    "description": "Auto-detect intent from text.",
    "enums": {
      "tone": [
        {
          "label": "neutral",
          "value": "neutral"
        },
        {
          "label": "polite",
          "value": "polite"
        },
        {
          "label": "formal",
          "value": "formal"
        }
      ]
    },
    "fieldTypes": {
      "tone": "enum"
    },
    "hints": {},
    "industry": "",
    "label": "Auto Detect",
    "optional": [
      "tone"
    ],
    "required": [],
    "template": {
      "bodyPath": "",
      "subject": ""
    }
  },
  "delay_notice": {
    "description": "Notify a customer that a purchase order\u2019s shipping schedule has changed.",
    "enums": {
      "tone": [
        {
          "label": "neutral",
          "value": "neutral"
        },
        {
          "label": "polite",
          "value": "polite"
        },
        {
          "label": "formal",
          "value": "formal"
        }
      ]
    },
    "fieldTypes": {
      "customerName": "string",
      "newShip": "date",
      "partNumber": "string",
      "poNumber": "string",
      "previousShip": "date",
      "reason": "longtext",
      "tone": "enum"
    },
    "hints": {
      "customerName": "e.g., John Smith",
      "newShip": "updated ship date",
      "partNumber": "e.g., 28-4752-09A",
      "poNumber": "e.g., PO-10927",
      "previousShip": "previous confirmed ship date",
      "reason": "e.g., supplier delay, weather, production hold"
    },
    "industry": "",
    "label": "Delay Notice",
    "optional": [
      "tone"
    ],
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
    "enums": {
      "tone": [
        {
          "label": "neutral",
          "value": "neutral"
        },
        {
          "label": "polite",
          "value": "polite"
        },
        {
          "label": "formal",
          "value": "formal"
        }
      ]
    },
    "fieldTypes": {
      "context": "longtext",
      "customerName": "string",
      "tone": "enum"
    },
    "hints": {
      "context": "e.g., \"the quote for PO-10927\" or \"yesterday\u2019s delivery timing\"",
      "customerName": "e.g., \"John Smith\""
    },
    "industry": "",
    "label": "Follow-up",
    "optional": [
      "tone"
    ],
    "required": [
      "customerName",
      "context"
    ],
    "template": {
      "bodyPath": "templates/followup.txt",
      "subject": "Follow-up \u2013 {{ context }}"
    }
  },
  "invoice_payment": {
    "description": "Notify or confirm payment for an invoice.",
    "enums": {
      "tone": [
        {
          "label": "neutral",
          "value": "neutral"
        },
        {
          "label": "polite",
          "value": "polite"
        },
        {
          "label": "formal",
          "value": "formal"
        }
      ]
    },
    "fieldTypes": {
      "amount": "string",
      "invoiceNumber": "string",
      "paymentDate": "date",
      "paymentMethod": "string",
      "recipientName": "string",
      "tone": "enum"
    },
    "hints": {
      "amount": "e.g., 420.00 USD",
      "invoiceNumber": "e.g., INV-4827",
      "paymentDate": "mm/dd/yyyy",
      "paymentMethod": "e.g., ACH, Check, Credit Card",
      "recipientName": "e.g., John Smith"
    },
    "industry": "",
    "label": "Invoice Payment",
    "optional": [
      "tone"
    ],
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
    "enums": {
      "tone": [
        {
          "label": "neutral",
          "value": "neutral"
        },
        {
          "label": "polite",
          "value": "polite"
        },
        {
          "label": "formal",
          "value": "formal"
        }
      ]
    },
    "fieldTypes": {
      "dueDate": "date",
      "invoiceNumber": "string",
      "poNumber": "string",
      "recipientName": "string",
      "tone": "enum"
    },
    "hints": {
      "dueDate": "mm/dd/yyyy",
      "invoiceNumber": "e.g., INV-4827",
      "poNumber": "e.g., PO-10892",
      "recipientName": "e.g., John Smith"
    },
    "industry": "",
    "label": "Invoice / PO Follow-Up",
    "optional": [
      "tone"
    ],
    "required": [
      "recipientName",
      "invoiceNumber",
      "poNumber",
      "dueDate"
    ],
    "template": {
      "bodyPath": "templates/invoice_po_followup.txt",
      "subject": "Follow-Up on Invoice {{ invoiceNumber }} / PO {{ poNumber }} \u2014 Due {{ dueDate }}"
    }
  },
  "logistics_supply_chain_delivery_confirmation": {
    "description": "Confirm a shipment has been delivered, with POD details if available.",
    "enums": {
      "tone": [
        {
          "label": "neutral",
          "value": "neutral"
        },
        {
          "label": "polite",
          "value": "polite"
        },
        {
          "label": "formal",
          "value": "formal"
        }
      ]
    },
    "fieldTypes": {
      "carrier": "string",
      "customerName": "string",
      "deliveredDate": "date",
      "notes": "longtext",
      "podLink": "string",
      "receivedBy": "string",
      "tone": "enum",
      "trackingNumber": "string"
    },
    "hints": {
      "deliveredDate": "actual delivery date",
      "receivedBy": "name on POD"
    },
    "industry": "Logistics & Supply Chain",
    "label": "Delivery Confirmation",
    "optional": [
      "carrier",
      "receivedBy",
      "podLink",
      "notes",
      "tone"
    ],
    "required": [
      "customerName",
      "trackingNumber",
      "deliveredDate"
    ],
    "template": {
      "bodyPath": "templates/logistics_supply_chain/logistics_supply_chain_delivery_confirmation.j2",
      "subject": "Subject \u2014 {{ field1 }}"
    }
  },
  "logistics_supply_chain_freight_quote": {
    "description": "Request a freight quote with lanes, weights, and service preferences.",
    "enums": {
      "tone": [
        {
          "label": "neutral",
          "value": "neutral"
        },
        {
          "label": "polite",
          "value": "polite"
        },
        {
          "label": "formal",
          "value": "formal"
        }
      ]
    },
    "fieldTypes": {
      "customerName": "string",
      "destination": "string",
      "dims": "string",
      "notes": "longtext",
      "origin": "string",
      "pieces": "number",
      "readyDate": "date",
      "serviceLevel": "string",
      "tone": "enum",
      "weight": "string"
    },
    "hints": {
      "destination": "city/state or port",
      "dims": "e.g., 48x40x30 in",
      "origin": "city/state or port",
      "serviceLevel": "e.g., standard, expedited",
      "weight": "e.g., 250 lb"
    },
    "industry": "Logistics & Supply Chain",
    "label": "Freight Quote",
    "optional": [
      "pieces",
      "weight",
      "dims",
      "serviceLevel",
      "readyDate",
      "notes",
      "tone"
    ],
    "required": [
      "customerName",
      "origin",
      "destination"
    ],
    "template": {
      "bodyPath": "templates/logistics_supply_chain/logistics_supply_chain_freight_quote.j2",
      "subject": "Subject \u2014 {{ field1 }}"
    }
  },
  "logistics_supply_chain_pod_request": {
    "description": "Request proof of delivery for a completed shipment.",
    "enums": {
      "tone": [
        {
          "label": "neutral",
          "value": "neutral"
        },
        {
          "label": "polite",
          "value": "polite"
        },
        {
          "label": "formal",
          "value": "formal"
        }
      ]
    },
    "fieldTypes": {
      "carrier": "string",
      "customerName": "string",
      "deliveredDate": "date",
      "notes": "longtext",
      "tone": "enum",
      "trackingNumber": "string"
    },
    "hints": {
      "deliveredDate": "if known, helps locate POD"
    },
    "industry": "Logistics & Supply Chain",
    "label": "POD Request",
    "optional": [
      "carrier",
      "deliveredDate",
      "notes",
      "tone"
    ],
    "required": [
      "customerName",
      "trackingNumber"
    ],
    "template": {
      "bodyPath": "templates/logistics_supply_chain/logistics_supply_chain_pod_request.j2",
      "subject": "Subject \u2014 {{ field1 }}"
    }
  },
  "logistics_supply_chain_shipment_booking": {
    "description": "Book a shipment with lane details and pickup instructions.",
    "enums": {
      "tone": [
        {
          "label": "neutral",
          "value": "neutral"
        },
        {
          "label": "polite",
          "value": "polite"
        },
        {
          "label": "formal",
          "value": "formal"
        }
      ]
    },
    "fieldTypes": {
      "accountNumber": "string",
      "carrier": "string",
      "customerName": "string",
      "deliveryNotes": "longtext",
      "destination": "string",
      "dims": "string",
      "origin": "string",
      "pickupNotes": "longtext",
      "pieces": "number",
      "readyDate": "date",
      "tone": "enum",
      "weight": "string"
    },
    "hints": {
      "destination": "city/state or port",
      "origin": "city/state or port",
      "readyDate": "earliest pickup date"
    },
    "industry": "Logistics & Supply Chain",
    "label": "Shipment Booking",
    "optional": [
      "pieces",
      "weight",
      "dims",
      "carrier",
      "accountNumber",
      "pickupNotes",
      "deliveryNotes",
      "tone"
    ],
    "required": [
      "customerName",
      "origin",
      "destination",
      "readyDate"
    ],
    "template": {
      "bodyPath": "templates/logistics_supply_chain/logistics_supply_chain_shipment_booking.j2",
      "subject": "Subject \u2014 {{ field1 }}"
    }
  },
  "logistics_supply_chain_tracking_update": {
    "description": "Provide tracking details or a status change for an in-transit shipment.",
    "enums": {
      "tone": [
        {
          "label": "neutral",
          "value": "neutral"
        },
        {
          "label": "polite",
          "value": "polite"
        },
        {
          "label": "formal",
          "value": "formal"
        }
      ]
    },
    "fieldTypes": {
      "carrier": "string",
      "customerName": "string",
      "eta": "date",
      "link": "string",
      "notes": "longtext",
      "status": "string",
      "tone": "enum",
      "trackingNumber": "string"
    },
    "hints": {
      "eta": "estimated delivery date",
      "status": "e.g., in transit, out for delivery",
      "trackingNumber": "carrier tracking number"
    },
    "industry": "Logistics & Supply Chain",
    "label": "Tracking Update",
    "optional": [
      "carrier",
      "eta",
      "status",
      "link",
      "notes",
      "tone"
    ],
    "required": [
      "customerName",
      "trackingNumber"
    ],
    "template": {
      "bodyPath": "templates/logistics_supply_chain/logistics_supply_chain_tracking_update.j2",
      "subject": "Subject \u2014 {{ field1 }}"
    }
  },
  "order_confirmation": {
    "description": "Confirm that an order has been received and provide delivery details.",
    "enums": {
      "tone": [
        {
          "label": "neutral",
          "value": "neutral"
        },
        {
          "label": "polite",
          "value": "polite"
        },
        {
          "label": "formal",
          "value": "formal"
        }
      ]
    },
    "fieldTypes": {
      "itemsSummary": "longtext",
      "poNumber": "string",
      "promisedShip": "date",
      "recipientName": "string",
      "tone": "enum"
    },
    "hints": {
      "itemsSummary": "e.g., 10 \u00d7 Part A, 5 \u00d7 Part B",
      "poNumber": "e.g., PO-10832",
      "promisedShip": "mm/dd/yyyy",
      "recipientName": "e.g., John Smith"
    },
    "industry": "",
    "label": "Order Confirmation",
    "optional": [
      "tone"
    ],
    "required": [
      "recipientName",
      "poNumber",
      "itemsSummary",
      "promisedShip"
    ],
    "template": {
      "bodyPath": "templates/order_confirmation.txt",
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
      ],
      "tone": [
        {
          "label": "neutral",
          "value": "neutral"
        },
        {
          "label": "polite",
          "value": "polite"
        },
        {
          "label": "formal",
          "value": "formal"
        }
      ]
    },
    "fieldTypes": {
      "fedexAccount": "enum",
      "notes": "longtext",
      "parts": "longtext",
      "recipientName": "string",
      "shipAddress": "longtext",
      "tone": "enum"
    },
    "hints": {
      "fedexAccount": "Select shipper account number",
      "fedexAccountLabels": "{\n  \"031400023\": \"MEXICALI/COMPLETIONS\",\n  \"240920760\": \"EDWARDS\",\n  \"228448800\": \"DALLAS/FORTH WORTH\",\n  \"805079878\": \"SPARES/RDCFP (INNOVATION DR)\",\n  \"054900023\": \"APPLETON\",\n  \"335312570\": \"CAHOKIA\",\n  \"161038032\": \"ELISE ST\",\n  \"231190686\": \"WEST PALM BEACH\",\n  \"158314215\": \"BRUNSWICK\",\n  \"323701300\": \"MESA\",\n  \"091536978\": \"GILL CORP\"\n}\n",
      "notes": "Optional special instructions or comments",
      "parts": "List PN and qty lines",
      "recipientName": "e.g., \"UP Aviation Receiving\"",
      "shipAddress": "Full street, city, state, zip"
    },
    "industry": "",
    "label": "Order Request",
    "optional": [
      "notes",
      "tone"
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
    "enums": {
      "tone": [
        {
          "label": "neutral",
          "value": "neutral"
        },
        {
          "label": "polite",
          "value": "polite"
        },
        {
          "label": "formal",
          "value": "formal"
        }
      ]
    },
    "fieldTypes": {
      "customerName": "string",
      "docsList": "longtext",
      "notes": "longtext",
      "poNumber": "string",
      "tone": "enum"
    },
    "hints": {
      "customerName": "e.g., John Smith",
      "docsList": "e.g., \"Packing Slip, Invoice, CoC\"",
      "notes": "Optional internal note or context",
      "poNumber": "e.g., PO-10922"
    },
    "industry": "",
    "label": "Packing Slip / Documents",
    "optional": [
      "tone"
    ],
    "required": [
      "customerName",
      "poNumber",
      "docsList"
    ],
    "template": {
      "bodyPath": "templates/packing_slip_docs.txt",
      "subject": "Documents for PO {{ poNumber }}"
    }
  },
  "qb_order": {
    "description": "QuickBooks order request or confirmation message.",
    "enums": {
      "tone": [
        {
          "label": "neutral",
          "value": "neutral"
        },
        {
          "label": "polite",
          "value": "polite"
        },
        {
          "label": "formal",
          "value": "formal"
        }
      ]
    },
    "fieldTypes": {
      "orderDate": "date",
      "orderNumber": "string",
      "recipientName": "string",
      "senderName": "string",
      "shipDate": "date",
      "tone": "enum"
    },
    "hints": {
      "orderDate": "mm/dd/yyyy",
      "orderNumber": "e.g., PO-10941",
      "recipientName": "e.g., \"UP Aviation Accounting\"",
      "senderName": "e.g., \"Kennedy Harper\"",
      "shipDate": "mm/dd/yyyy"
    },
    "industry": "",
    "label": "QB Order",
    "optional": [
      "tone"
    ],
    "required": [
      "recipientName"
    ],
    "template": {
      "bodyPath": "templates/qb_order.txt",
      "subject": "QB Order \u2013 {{ orderNumber or recipientName }}"
    }
  },
  "quote_request": {
    "description": "Request pricing and lead time for a specific part and quantity.",
    "enums": {
      "tone": [
        {
          "label": "neutral",
          "value": "neutral"
        },
        {
          "label": "polite",
          "value": "polite"
        },
        {
          "label": "formal",
          "value": "formal"
        }
      ]
    },
    "fieldTypes": {
      "customerName": "string",
      "needByDate": "date",
      "notes": "longtext",
      "partNumber": "string",
      "quantity": "string",
      "tone": "enum"
    },
    "hints": {
      "customerName": "e.g., \"John Smith\"",
      "needByDate": "mm/dd/yyyy (optional target date)",
      "notes": "Optional context or constraints (e.g., MOQs, alt parts)",
      "partNumber": "e.g., \"PN-10423\"",
      "quantity": "e.g., \"2\""
    },
    "industry": "",
    "label": "Quote Request",
    "optional": [
      "needByDate",
      "notes",
      "tone"
    ],
    "required": [
      "customerName",
      "partNumber",
      "quantity"
    ],
    "template": {
      "bodyPath": "templates/quote_request.txt",
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
      ],
      "tone": [
        {
          "label": "neutral",
          "value": "neutral"
        },
        {
          "label": "polite",
          "value": "polite"
        },
        {
          "label": "formal",
          "value": "formal"
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
      "tone": "enum",
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
    "industry": "",
    "label": "Shipment Update",
    "optional": [
      "carrierOther",
      "notes",
      "tone"
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
      "bodyPath": "templates/shipment_update.txt",
      "subject": "Tracking \u2013 PO {{ poNumber }} (Shipped {{ shipDate }})"
    }
  },
  "tax_exemption": {
    "description": "Notify a customer about tax-exempt status or send a tax-exempt certificate.",
    "enums": {
      "tone": [
        {
          "label": "neutral",
          "value": "neutral"
        },
        {
          "label": "polite",
          "value": "polite"
        },
        {
          "label": "formal",
          "value": "formal"
        }
      ]
    },
    "fieldTypes": {
      "recipientName": "string",
      "tone": "enum"
    },
    "hints": {
      "recipientName": "e.g., \"Accounts Payable\""
    },
    "industry": "",
    "label": "Tax Exemption",
    "optional": [
      "tone"
    ],
    "required": [
      "recipientName"
    ],
    "template": {
      "bodyPath": "templates/tax_exemption.txt",
      "subject": "Tax Exempt Certificate Attached"
    }
  }
}
