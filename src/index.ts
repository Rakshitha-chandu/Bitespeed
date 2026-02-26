import express from "express"
import { PrismaClient } from "@prisma/client"

const app = express()
const prisma = new PrismaClient()

app.use(express.json())
app.post("/identify", async (req, res) => {
  const { email, phoneNumber } = req.body

  // Step 1: Find all matching contacts
  const matchedContacts = await prisma.contact.findMany({
    where: {
      OR: [
        { email: email ?? undefined },
        { phoneNumber: phoneNumber ?? undefined }
      ]
    },
    orderBy: { createdAt: "asc" }
  })

  // CASE 1: No contacts found → create primary
  if (matchedContacts.length === 0) {
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

  // Step 2: Get all related contacts (including linked ones)
  const relatedContacts = await prisma.contact.findMany({
    where: {
      OR: [
        { id: { in: matchedContacts.map(c => c.id) } },
        { linkedId: { in: matchedContacts.map(c => c.id) } }
      ]
    },
    orderBy: { createdAt: "asc" }
  })

  // Step 3: Find the true primary (oldest primary)
  let primary = relatedContacts.find(c => c.linkPrecedence === "primary")

  if (!primary) {
    primary = relatedContacts[0]
  }

  // Step 4: Merge multiple primaries if needed
  const otherPrimaries = relatedContacts.filter(
    c => c.linkPrecedence === "primary" && c.id !== primary!.id
  )

  for (const p of otherPrimaries) {
    await prisma.contact.update({
      where: { id: p.id },
      data: {
        linkPrecedence: "secondary",
        linkedId: primary!.id
      }
    })
  }

  // Step 5: Check if new info needs new secondary
  const allContacts = await prisma.contact.findMany({
    where: {
      OR: [
        { id: primary!.id },
        { linkedId: primary!.id }
      ]
    }
  })

  const emailExists = allContacts.some(c => c.email === email)
  const phoneExists = allContacts.some(c => c.phoneNumber === phoneNumber)

  if (!emailExists || !phoneExists) {
    await prisma.contact.create({
      data: {
        email,
        phoneNumber,
        linkedId: primary!.id,
        linkPrecedence: "secondary"
      }
    })
  }

  // Step 6: Fetch final full group
  const finalContacts = await prisma.contact.findMany({
    where: {
      OR: [
        { id: primary!.id },
        { linkedId: primary!.id }
      ]
    }
  })

  const emails = [...new Set(finalContacts.map(c => c.email).filter(Boolean))]
  const phoneNumbers = [...new Set(finalContacts.map(c => c.phoneNumber).filter(Boolean))]
  const secondaryContactIds = finalContacts
    .filter(c => c.linkPrecedence === "secondary")
    .map(c => c.id)

  return res.status(200).json({
    contact: {
      primaryContactId: primary!.id,
      emails,
      phoneNumbers,
      secondaryContactIds
    }
  })
})

app.listen(3000, () => {
  console.log("Server running on port 3000")
})