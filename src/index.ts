import express from "express"
import { PrismaClient } from "@prisma/client"

const app = express()
const prisma = new PrismaClient()

app.use(express.json())

app.post("/identify", async (req, res) => {
  const { email, phoneNumber } = req.body

  // Step 1: Find existing contacts
  const existingContacts = await prisma.contact.findMany({
    where: {
      OR: [
        { email: email ?? undefined },
        { phoneNumber: phoneNumber ?? undefined }
      ]
    },
    orderBy: {
      createdAt: "asc"
    }
  })

  // Step 2: If no contact found → create primary
  if (existingContacts.length === 0) {
    const newContact = await prisma.contact.create({
      data: {
        email,
        phoneNumber,
        linkPrecedence: "primary"
      }
    })

    return res.status(200).json({
      contact: {
        primaryContactId: newContact.id,
        emails: [newContact.email],
        phoneNumbers: [newContact.phoneNumber],
        secondaryContactIds: []
      }
    })
  }

  // Step 3: Find primary contact (oldest one)
  let primary = existingContacts.find(c => c.linkPrecedence === "primary")

  if (!primary) {
    primary = existingContacts[0]
  }

  // Step 4: Check if new info exists
  const emailExists = existingContacts.some(c => c.email === email)
  const phoneExists = existingContacts.some(c => c.phoneNumber === phoneNumber)

  if (!emailExists || !phoneExists) {
    await prisma.contact.create({
      data: {
        email,
        phoneNumber,
        linkedId: primary.id,
        linkPrecedence: "secondary"
      }
    })
  }

  // Step 5: Fetch full linked group
  const allContacts = await prisma.contact.findMany({
    where: {
      OR: [
        { id: primary.id },
        { linkedId: primary.id }
      ]
    }
  })

  const emails = [...new Set(allContacts.map(c => c.email).filter(Boolean))]
  const phoneNumbers = [...new Set(allContacts.map(c => c.phoneNumber).filter(Boolean))]
  const secondaryContactIds = allContacts
    .filter(c => c.linkPrecedence === "secondary")
    .map(c => c.id)

  return res.status(200).json({
    contact: {
      primaryContactId: primary.id,
      emails,
      phoneNumbers,
      secondaryContactIds
    }
  })
})

app.listen(3000, () => {
  console.log("Server running on port 3000")
})