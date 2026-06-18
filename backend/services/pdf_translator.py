from deep_translator import GoogleTranslator

def translate_text(text: str) -> str:
    # Translate Vietnamese to standard English
    translator = GoogleTranslator(source='vi', target='en')
    # GoogleTranslator handles up to 5000 characters, so we chunk it if necessary
    chunks = [text[i:i+4900] for i in range(0, len(text), 4900)]
    translated = []
    for chunk in chunks:
        translated.append(translator.translate(chunk))
    return " ".join(translated)
