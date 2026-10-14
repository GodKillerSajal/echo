export type RelationshipType = "Friend" | "Family" | "Partner" | "Professional";

export interface Contact {
  id: string;
  name: string;
  relationship_type: RelationshipType;
  last_contact_date: string;
  profile_picture: string;
  created_at: string;
  bio?: string;
}

export interface Message {
  id: string;
  contact_id: string;
  sender: "user" | "contact";
  message_text: string;
  timestamp: string;
}

export interface Memory {
  id: string;
  contact_id: string;
  memory_text: string;
  importance_score: number; // 1-10
  created_at: string;
}

export type ReminderStatus = "pending" | "completed";

export interface Reminder {
  id: string;
  contact_id: string;
  title: string;
  description: string;
  due_date: string;
  status: ReminderStatus;
  reason?: string;
}

export interface UserStyleProfile {
  id: string;
  average_message_length: "short" | "medium" | "long";
  tone: "casual" | "professional" | "humorous";
  emoji_usage: "low" | "medium" | "high";
}
