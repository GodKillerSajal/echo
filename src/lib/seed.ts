import type { Contact, Memory, Message, Reminder, UserStyleProfile } from "./types";

const now = Date.now();
const day = 86400000;
const hour = 3600000;
const min = 60000;

const iso = (offset: number) => new Date(now - offset).toISOString();

export const seedContacts: Contact[] = [
  {
    id: "c1",
    name: "Sarah Chen",
    relationship_type: "Friend",
    last_contact_date: iso(2 * hour),
    profile_picture: "SC",
    created_at: iso(120 * day),
    bio: "College best friend. Software engineer.",
  },
  {
    id: "c2",
    name: "Rahul Sharma",
    relationship_type: "Friend",
    last_contact_date: iso(3 * day),
    profile_picture: "RS",
    created_at: iso(400 * day),
    bio: "Old roommate. Recently moved to Bangalore.",
  },
  {
    id: "c3",
    name: "Emily Parker",
    relationship_type: "Partner",
    last_contact_date: iso(40 * min),
    profile_picture: "EP",
    created_at: iso(700 * day),
    bio: "Partner of 3 years.",
  },
  {
    id: "c4",
    name: "John Mitchell",
    relationship_type: "Professional",
    last_contact_date: iso(18 * day),
    profile_picture: "JM",
    created_at: iso(200 * day),
    bio: "Co-founder at startup.",
  },
  {
    id: "c5",
    name: "Alex Rivera",
    relationship_type: "Family",
    last_contact_date: iso(6 * day),
    profile_picture: "AR",
    created_at: iso(900 * day),
    bio: "Cousin. Lives in Lisbon.",
  },
];

// Conversation generator helpers
type Turn = [sender: "user" | "contact", text: string];
function buildMessages(contactId: string, startOffset: number, turns: Turn[]): Message[] {
  // Spread turns across time, newest last
  const total = turns.length;
  return turns.map((t, i) => ({
    id: `${contactId}-m${i}`,
    contact_id: contactId,
    sender: t[0],
    message_text: t[1],
    timestamp: iso(startOffset - i * (12 * min) + (total - i) * 3 * min),
  }));
}

const sarahTurns: Turn[] = [
  ["contact", "Hey! Long time. How's the new job?"],
  ["user", "It's been wild but good. Lots to learn."],
  ["contact", "Tell me about it. I just got an interview at Google next Friday 😬"],
  ["user", "Whaaat that's huge! Congrats on landing it."],
  ["contact", "Thanks. I'm super stressed though, the prep is brutal."],
  ["user", "You've prepped harder than anyone I know. You'll crush it."],
  ["contact", "I hope so. They said it's 5 rounds, including a system design one."],
  ["user", "Want me to do a mock with you this weekend?"],
  ["contact", "Yes please!! Saturday afternoon?"],
  ["user", "Done. 3pm your time?"],
  ["contact", "Perfect."],
  ["contact", "Btw did you finish the Murakami book I lent you?"],
  ["user", "Half way. It's incredible."],
  ["contact", "Right?! Wait till you hit chapter 12."],
  ["user", "Don't spoil it!"],
  ["contact", "I would never 😇"],
  ["user", "Sure 😂"],
  ["contact", "Also, my sister is visiting next month, you guys should finally meet."],
  ["user", "I'd love that. Just give me dates."],
  ["contact", "Will do. She lands the 14th."],
  ["user", "Noted."],
  ["contact", "Okay running to a meeting. Talk later ❤️"],
  ["user", "Go crush it."],
  ["contact", "I am really stressed these days honestly."],
];

const rahulTurns: Turn[] = [
  ["user", "Bro how's Bangalore treating you?"],
  ["contact", "Honestly? Traffic is insane but the food makes up for it."],
  ["user", "Ha. Found a place yet?"],
  ["contact", "Yeah, in Indiranagar. Small but cozy."],
  ["user", "Nice area. Lots of cafes."],
  ["contact", "Working from one right now actually."],
  ["user", "How's the new role going?"],
  ["contact", "Steep learning curve. Lots of infra work."],
  ["user", "You'll figure it out. You always do."],
  ["contact", "Thanks man. Means a lot."],
  ["contact", "Btw I'm planning a Japan trip in October. Wanna join?"],
  ["user", "Tempting. Let me check my calendar."],
  ["contact", "Cherry blossoms will be done but the food, dude."],
  ["user", "Okay you had me at food."],
  ["contact", "Haha. I'll send you the rough itinerary."],
  ["user", "Cool. Also send pics of the new place."],
  ["contact", "Will do tonight."],
  ["user", "How's your dad doing post surgery?"],
  ["contact", "Recovering well. Walking on his own now."],
  ["user", "That's such great news."],
  ["contact", "Yeah, big relief."],
  ["contact", "Alright, back to standup. Catch up properly soon?"],
  ["user", "Definitely. Take care."],
];

const emilyTurns: Turn[] = [
  ["contact", "Are we still on for dinner Friday?"],
  ["user", "Yes! 8pm at the Italian place?"],
  ["contact", "Perfect. I'll book."],
  ["user", "How was your day?"],
  ["contact", "Long. Client meeting ran over."],
  ["user", "Want me to pick up groceries?"],
  ["contact", "Could you grab oat milk and bread?"],
  ["user", "On it."],
  ["contact", "You're the best 🥰"],
  ["user", "I try."],
  ["contact", "Mom called. She wants us over Sunday."],
  ["user", "Works for me. I'll bring wine."],
  ["contact", "She'll love that."],
  ["user", "How's your back today?"],
  ["contact", "Better. The new chair is helping."],
  ["user", "Good. Don't skip your stretches."],
  ["contact", "Yes coach 🙄"],
  ["user", "😂"],
  ["contact", "Don't forget our anniversary is on the 22nd!"],
  ["user", "As if I would."],
  ["contact", "Mmhm. Last year someone forgot for a hot 6 hours."],
  ["user", "We agreed never to speak of that."],
  ["contact", "Heading to bed early tonight. Love you."],
  ["user", "Love you. Sleep well."],
];

const johnTurns: Turn[] = [
  ["user", "How's the launch prep?"],
  ["contact", "Stressful. We push to prod Tuesday."],
  ["user", "You'll be fine. The demo last week was solid."],
  ["contact", "Thanks. Investors want a follow-up call Wednesday."],
  ["user", "Want me to join?"],
  ["contact", "Please. Your numbers always land better than mine."],
  ["user", "Deal. Send a calendar invite."],
  ["contact", "Sent."],
  ["contact", "Also we should finalize the pitch deck this weekend."],
  ["user", "Saturday morning works."],
  ["contact", "Perfect."],
  ["user", "Hiring update?"],
  ["contact", "Two strong eng candidates. Offers going out Monday."],
  ["user", "Great. Equity split sorted?"],
  ["contact", "Mostly. Let's confirm in person."],
  ["user", "Okay."],
  ["contact", "Saw your post on launch metrics. Sharp."],
  ["user", "Thanks. Trying to build in public more."],
  ["contact", "Smart."],
  ["contact", "Talk Saturday."],
];

const alexTurns: Turn[] = [
  ["contact", "Tia's birthday is on the 28th, don't forget!"],
  ["user", "Already on my calendar."],
  ["contact", "Good. She's turning 70 so we want it special."],
  ["user", "I'm in. Should I send flowers?"],
  ["contact", "She'd love that. Lilies."],
  ["user", "Done."],
  ["contact", "Btw I'm planning a Lisbon trip for the family in December."],
  ["user", "Count me in. I haven't seen the cousins in ages."],
  ["contact", "Yay! I'll start a group chat."],
  ["user", "Cool."],
  ["contact", "How's work?"],
  ["user", "Busy but good."],
  ["contact", "And you? Eating properly?"],
  ["user", "Mostly 😅"],
  ["contact", "Mostly is not yes."],
  ["user", "Fair."],
  ["contact", "Mom sends her love."],
  ["user", "Tell her I'll call this weekend."],
  ["contact", "Will do."],
  ["contact", "Take care kiddo ❤️"],
];

export const seedMessages: Message[] = [
  ...buildMessages("c1", 2 * hour, sarahTurns),
  ...buildMessages("c2", 3 * day, rahulTurns),
  ...buildMessages("c3", 40 * min, emilyTurns),
  ...buildMessages("c4", 18 * day, johnTurns),
  ...buildMessages("c5", 6 * day, alexTurns),
];

export const seedMemories: Memory[] = [
  { id: "mem1", contact_id: "c1", memory_text: "Google interview next Friday — 5 rounds incl. system design", importance_score: 10, created_at: iso(1 * day) },
  { id: "mem2", contact_id: "c1", memory_text: "Mock interview scheduled Saturday 3pm", importance_score: 8, created_at: iso(1 * day) },
  { id: "mem3", contact_id: "c1", memory_text: "Lent her Murakami book — she's halfway", importance_score: 4, created_at: iso(2 * day) },
  { id: "mem4", contact_id: "c1", memory_text: "Sister visiting on the 14th of next month", importance_score: 7, created_at: iso(2 * day) },

  { id: "mem5", contact_id: "c2", memory_text: "Recently moved to Bangalore, Indiranagar", importance_score: 9, created_at: iso(7 * day) },
  { id: "mem6", contact_id: "c2", memory_text: "Started new infra-heavy role", importance_score: 6, created_at: iso(7 * day) },
  { id: "mem7", contact_id: "c2", memory_text: "Planning Japan trip in October", importance_score: 8, created_at: iso(4 * day) },
  { id: "mem8", contact_id: "c2", memory_text: "Father recovering well from surgery", importance_score: 9, created_at: iso(10 * day) },

  { id: "mem9", contact_id: "c3", memory_text: "Anniversary on the 22nd", importance_score: 10, created_at: iso(1 * day) },
  { id: "mem10", contact_id: "c3", memory_text: "Dinner Friday 8pm — Italian place", importance_score: 7, created_at: iso(0.5 * day) },
  { id: "mem11", contact_id: "c3", memory_text: "Visiting her mom Sunday", importance_score: 6, created_at: iso(0.5 * day) },
  { id: "mem12", contact_id: "c3", memory_text: "Back pain — new chair helping", importance_score: 5, created_at: iso(3 * day) },

  { id: "mem13", contact_id: "c4", memory_text: "Product launch Tuesday", importance_score: 10, created_at: iso(2 * day) },
  { id: "mem14", contact_id: "c4", memory_text: "Investor follow-up call Wednesday", importance_score: 9, created_at: iso(2 * day) },
  { id: "mem15", contact_id: "c4", memory_text: "Two eng offers going out Monday", importance_score: 6, created_at: iso(3 * day) },

  { id: "mem16", contact_id: "c5", memory_text: "Tia's 70th birthday on the 28th", importance_score: 10, created_at: iso(5 * day) },
  { id: "mem17", contact_id: "c5", memory_text: "Family Lisbon trip planned for December", importance_score: 8, created_at: iso(4 * day) },
];

export const seedReminders: Reminder[] = [
  {
    id: "r1", contact_id: "c1", title: "Check in with Sarah after Google interview",
    description: "She has the 5-round interview Friday. Send a quick supportive message after.",
    due_date: new Date(now + 7 * day).toISOString(), status: "pending",
    reason: "Detected from message: \"interview at Google next Friday\"",
  },
  {
    id: "r2", contact_id: "c3", title: "Anniversary with Emily",
    description: "Plan something thoughtful. Book restaurant.",
    due_date: new Date(now + 14 * day).toISOString(), status: "pending",
    reason: "Detected from message: \"our anniversary is on the 22nd\"",
  },
  {
    id: "r3", contact_id: "c4", title: "Join John's investor call",
    description: "Investor follow-up call Wednesday. Prep numbers.",
    due_date: new Date(now + 3 * day).toISOString(), status: "pending",
    reason: "Detected commitment in chat with John.",
  },
  {
    id: "r4", contact_id: "c5", title: "Send lilies for Tia's 70th",
    description: "Order flowers ahead of the 28th.",
    due_date: new Date(now + 10 * day).toISOString(), status: "pending",
    reason: "Detected from message: \"Tia's birthday is on the 28th\"",
  },
  {
    id: "r5", contact_id: "c2", title: "Confirm Japan trip dates",
    description: "Rahul is planning October trip — confirm availability.",
    due_date: new Date(now + 5 * day).toISOString(), status: "pending",
    reason: "Detected travel plan in chat with Rahul.",
  },
  {
    id: "r6", contact_id: "c1", title: "Mock interview with Sarah",
    description: "Saturday 3pm — system design mock.",
    due_date: new Date(now + 2 * day).toISOString(), status: "pending",
    reason: "Scheduled in chat with Sarah.",
  },
  {
    id: "r7", contact_id: "c3", title: "Pick up oat milk & bread",
    description: "Emily asked.",
    due_date: new Date(now + 0.5 * day).toISOString(), status: "completed",
    reason: "Commitment in chat.",
  },
];

export const seedStyleProfile: UserStyleProfile = {
  id: "u1",
  average_message_length: "medium",
  tone: "casual",
  emoji_usage: "medium",
};
