/**
 * Telegram Bot API Wrapper
 */

/**
 * Sends a Telegram notification using a custom Bot Token and Chat ID.
 * 
 * @param {string} token - The Telegram Bot Token from BotFather
 * @param {string} chatId - The target Telegram Chat ID (user, group, channel)
 * @param {string} text - Message text (HTML formatting allowed)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendTelegramNotification(token, chatId, text) {
  if (!token || !chatId) {
    return { success: false, error: 'Telegram configuration is incomplete. Token or Chat ID is missing.' };
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      return { 
        success: false, 
        error: data.description || `HTTP status ${response.status}` 
      };
    }

    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown connection error' 
    };
  }
}
