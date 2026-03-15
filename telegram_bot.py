import threading
import logging
from telegram import Update
from telegram.ext import Application, MessageHandler, CommandHandler, filters, ContextTypes
import httpx

API = "http://127.0.0.1:8000"
logging.basicConfig(format="%(asctime)s - %(levelname)s - %(message)s", level=logging.INFO)


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "👋 *AI Team Bot is ready!*\n\n"
        "Just type anything and I'll answer.\n\n"
        "*Optional prefixes:*\n"
        "`code:` → coding questions\n"
        "`research:` → deep research\n\n"
        "_(no prefix = best answer from all models)_",
        parse_mode="Markdown"
    )

async def clear(update: Update, context: ContextTypes.DEFAULT_TYPE):
    session_id = str(update.effective_chat.id)
    async with httpx.AsyncClient() as client:
        await client.delete(f"{API}/memory/{session_id}")
    await update.message.reply_text("🧹 Memory cleared!")

async def help_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "/start — welcome\n/clear — reset memory\n/help — this message",
        parse_mode="Markdown"
    )

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text.strip()
    session_id = str(update.effective_chat.id)

    agent = "debate"
    prompt = text

    lower = text.lower()
    if lower.startswith("code:"):
        agent = "code"
        prompt = text[5:].strip()
    elif lower.startswith("research:"):
        agent = "research"
        prompt = text[9:].strip()

    if not prompt:
        await update.message.reply_text("Please add a prompt.")
        return

    await context.bot.send_chat_action(chat_id=update.effective_chat.id, action="typing")
    thinking = await update.message.reply_text("⏳ Thinking...")

    try:
        async with httpx.AsyncClient(timeout=180) as client:
            resp = await client.get(
                f"{API}/chat",
                params={"agent": agent, "prompt": prompt, "session_id": session_id}
            )
            result = resp.json()

        await thinking.delete()

        if "error" in result:
            await update.message.reply_text(f"❌ {result['error']}")
            return

        # Always return single best answer
        if agent == "debate":
            reply = result.get("best_answer", "No answer")
        elif agent == "code":
            reply = result.get("result", "No answer")
        else:
            reply = result.get("result", "No answer")

        await send_long(update, reply)

    except httpx.ConnectError:
        await thinking.delete()
        await update.message.reply_text("❌ Server not running. Start uvicorn first.")
    except Exception as e:
        await thinking.delete()
        await update.message.reply_text(f"❌ Error: {e}")


async def send_long(update: Update, text: str):
    clean = text.replace("*","").replace("_","").replace("`","").replace("[","").replace("]","")
    for i in range(0, len(clean), 4000):
        await update.message.reply_text(clean[i:i+4000])


def main():
    TOKEN = "8677091828:AAF6Tsxq2JYSEX6EM8mPQFS_LUyStnHGXRE"  

    if TOKEN == "YOUR_BOT_TOKEN_HERE":
        print("❌ Set your Telegram token in telegram_bot.py")
        return

    app = Application.builder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("clear", clear))
    app.add_handler(CommandHandler("help", help_cmd))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    print("🤖 Telegram bot running...")
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()