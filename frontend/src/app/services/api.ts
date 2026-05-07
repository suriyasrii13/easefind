const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_URL = import.meta.env.VITE_API_URL || "https://easefind-production.up.railway.app";

export const BASE_URL = `${API_URL}/api`;
export const SOCKET_URL = API_URL.replace("https://", "wss://").replace("http://", "ws://") + "/ws";
export const UPLOADS_URL = `${API_URL}/uploads`;

export const getMatches = async (userId?: string | number) => {
  const url = userId ? `${BASE_URL}/match?userId=${userId}` : `${BASE_URL}/match`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(await response.text());
  const data = await response.json();

  return data.map((match: any) => ({
    id: match.matchId,                     // backend → frontend
    lostItem: {
      ...match.lostItem,
      date: match.lostItem.dateLost,
      userName: match.lostItem.user?.name || "Owner",
      userId: match.lostItem.user?.userId || match.lostItem.userId
    },
    foundItem: {
      ...match.foundItem,
      date: match.foundItem.dateFound,
      userName: match.foundItem.finder?.name || "Finder",
      userId: match.foundItem.finder?.userId || match.foundItem.userId
    },
    confidence: match.confidenceScore * 100, // convert 0.9 → 90%
    matchReason: match.matchReason ? match.matchReason.split(', ') : ["AI visual & text similarity"],
    matchDate: match.createdAt || match.matchDate || new Date().toISOString(), // ✅ use real date
    status: match.status,
    isConfidential: match.lostItem?.confidential || match.foundItem?.confidential
  }));
};


export const verifySerialNumber = async (matchId: number, serialNumber: string) => {
  const response = await fetch(`${BASE_URL}/match/${matchId}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ serialNumber })
  });
  return await response.json();
};

export const confirmMatch = async (id: string | number) => {
  const response = await fetch(`${BASE_URL}/match/confirm/${id}`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Failed to confirm match: ${response.status}`);
  }
  return response.text();
};

export const deleteMatch = async (id: string | number) => {
  const response = await fetch(`${BASE_URL}/match/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(`Failed to delete match: ${response.status}`);
  }
  return response.text();
};

// --- CHAT SYSTEM ---
export interface ChatMessage {
  id?: number;
  matchId: number | string;
  senderId: number | string;
  content: string;
  timestamp?: string;
}

export const getChatMessages = async (matchId: string | number): Promise<ChatMessage[]> => {
  const response = await fetch(`${BASE_URL}/chat/${matchId}`);
  if (!response.ok) throw new Error("Failed to fetch messages");
  return response.json();
};

export const sendChatMessage = async (message: ChatMessage): Promise<ChatMessage> => {
  const response = await fetch(`${BASE_URL}/chat/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message),
  });
  if (!response.ok) throw new Error("Failed to send message");
  return response.json();
};

export const initiateChat = async (matchId: string | number, senderId: string | number) => {
  const response = await fetch(`${BASE_URL}/chat/initiate/${matchId}?senderId=${senderId}`, {
    method: "POST",
  });
  return response.json();
};

// --- NOTIFICATION SYSTEM ---
export interface Notification {
  id: number;
  recipientId: number;
  title: string;
  message: string;
  type: string;
  matchId: number;
  actionUrl?: string;
  actionText?: string;
  isRead: boolean;
  createdAt: string;
}

export const getNotifications = async (userId: string | number): Promise<Notification[]> => {
  const response = await fetch(`${BASE_URL}/notifications/${userId}`);
  if (!response.ok) throw new Error("Failed to fetch notifications");
  return response.json();
};

export const getUnreadNotificationCount = async (userId: string | number): Promise<number> => {
  const response = await fetch(`${BASE_URL}/notifications/${userId}/unread-count`);
  if (!response.ok) throw new Error("Failed to fetch count");
  return response.json();
};

export const getGlobalNotifications = async (): Promise<Notification[]> => {
  const response = await fetch(`${BASE_URL}/notifications/global`);
  if (!response.ok) throw new Error("Failed to fetch global notifications");
  return response.json();
};

export const markNotificationAsRead = async (notificationId: number): Promise<void> => {
  const response = await fetch(`${BASE_URL}/notifications/${notificationId}/read`, {
    method: "POST",
  });
  if (!response.ok) throw new Error("Failed to mark notification as read");
};

export const deleteNotification = async (notificationId: number): Promise<void> => {
  const response = await fetch(`${BASE_URL}/notifications/${notificationId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete notification");
};

export const clearAllNotifications = async (userId: string | number): Promise<void> => {
  const response = await fetch(`${BASE_URL}/notifications/user/${userId}/clear-all`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to clear all notifications");
};



export const getLostItems = async (userId?: string | number) => {
  const url = userId ? `${BASE_URL}/lost-items?userId=${userId}` : `${BASE_URL}/lost-items`;
  const response = await fetch(url);
  return response.json();
};

export const getFoundItems = async (userId?: string | number) => {
  const url = userId ? `${BASE_URL}/found-items?userId=${userId}` : `${BASE_URL}/found-items`;
  const response = await fetch(url);
  return response.json();
};

export const deleteLostItem = async (id: string | number) => {
  const response = await fetch(`${BASE_URL}/lost-items/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(`Failed to delete lost item: ${response.status}`);
  }
  return response.text();
};

export const deleteFoundItem = async (id: string | number) => {
  const response = await fetch(`${BASE_URL}/found-items/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(`Failed to delete found item: ${response.status}`);
  }
  return response.text();
};

export const registerUser = async (data: any) => {
  const response = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const result = await response.json();
  if (result.status !== "success") {
    throw new Error(result.message || "Registration failed");
  }
  return result;
};

export const loginUser = async (data: any) => {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Server Error: ${response.status}`);
  }

  const result = await response.json();
  
  if (result.status !== "success") {
    throw new Error(result.message || "Login failed");
  }

  return result;
};

export const reportItem = async (formData: FormData) => {
  const itemType = formData.get("itemType");
  const endpoint = itemType === "lost" ? "lost-items" : "found-items";

  const response = await fetch(`${BASE_URL}/${endpoint}`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    // Try to get detailed text error if JSON fails
    const errorText = await response.text().catch(() => "");
    let errorData = {};
    try {
      errorData = JSON.parse(errorText);
    } catch(e) {}

    throw new Error((errorData as any).message || (errorData as any).error || errorText || `Server Error: ${response.status}`);
  }

  return response.json();
};

export const updateProfile = async (data: any) => {
  const response = await fetch(`${BASE_URL}/users/update`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return response.json();
};

export const changePassword = async (data: any) => {
  const response = await fetch(`${BASE_URL}/users/change-password`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return response.json();
};
export const checkMatch = async (
  lostImage: File,
  foundImage: File,
  lostDescription: string,
  foundDescription: string
) => {
  const formData = new FormData();
  formData.append("lostImage", lostImage);
  formData.append("foundImage", foundImage);
  formData.append("lostDescription", lostDescription);
  formData.append("foundDescription", foundDescription);

  const response = await fetch(`${BASE_URL}/match/check`, {
    method: "POST",
    body: formData,
  });

  return response.text();
};

export const forgotPassword = async (email: string) => {
  const response = await fetch(`${BASE_URL}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  
  const result = await response.json();
  if (result.status !== "success") {
    throw new Error(result.message || "Failed to send reset link");
  }
  return result; // returning the whole result instead of throwing, it contains resetLink
};

export const resetPassword = async (token: string, newPassword: string) => {
  const response = await fetch(`${BASE_URL}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, newPassword }),
  });

  const result = await response.json();
  if (result.status !== "success") {
    throw new Error(result.message || "Failed to reset password");
  }
  return result;
};

export const askChatBot = async (query: string): Promise<{ response: string }> => {
  const response = await fetch(`${BASE_URL}/chatbot/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!response.ok) throw new Error("Failed to get AI response");
  return response.json();
};
