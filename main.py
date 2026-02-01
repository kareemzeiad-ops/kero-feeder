import streamlit as st
import google.generativeai as genai
import os

# إعداد الصفحة
st.set_page_config(page_title="Kero Feeder", page_icon="⚡")
st.title("🤖 مساعد Kero الذكي")

# إعداد المفتاح (سيعمل بمجرد وضعه في إعدادات الاستضافة)
API_KEY = os.getenv("AIzaSyDNwenOdoeIbiZH8GVnbagTF40TjYlJkv0")

if API_KEY:
    genai.configure(api_key=API_KEY)
    model = genai.GenerativeModel('gemini-1.5-flash')

    if "messages" not in st.session_state:
        st.session_state.messages = []

    for message in st.session_state.messages:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])

    if prompt := st.chat_input("اسألني أي شيء..."):
        st.session_state.messages.append({"role": "user", "content": prompt})
        with st.chat_message("user"):
            st.markdown(prompt)
        
        response = model.generate_content(prompt)
        with st.chat_message("assistant"):
            st.markdown(response.text)
            st.session_state.messages.append({"role": "assistant", "content": response.text})
else:
    st.warning("الرجاء إضافة API Key في الإعدادات لتشغيل الموقع.")
