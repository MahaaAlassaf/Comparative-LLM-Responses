import os
import asyncio
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.chains import RetrievalQA
from langchain_community.document_loaders import TextLoader, PyPDFLoader
from langchain_community.document_loaders import DirectoryLoader
from langchain_community.document_loaders import MergedDataLoader
from langchain_openai import ChatOpenAI
from langchain_community.llms import Replicate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from langchain import hub
from langchain.prompts import PromptTemplate

app = FastAPI()

# Read .env file and set environment variables
with open('.env') as f:
    for line in f:
        key, value = line.strip().split('=')
        os.environ[key] = value

# Create vector db
llm_3 = ChatOpenAI(model="gpt-3.5-turbo-0125")
llm_4 = ChatOpenAI(model="gpt-4o")
falcon = Replicate(model="joehoover/falcon-40b-instruct:7d58d6bddc53c23fa451c403b2b5373b1e0fa094e4e0d1b98c3d02931aa07173")
llama = Replicate(model="meta/llama-2-70b-chat")

persist_directory = 'db'
embedding = OpenAIEmbeddings()

# Load and process the text files
txt_loader = TextLoader('../Scrapping/concat.txt')
pdf_loader = DirectoryLoader('../Scrapping/english_pdfs', glob="./*.pdf", loader_cls=PyPDFLoader, show_progress=True)
loader = MergedDataLoader([txt_loader, pdf_loader])

if not os.path.exists(persist_directory):
    print("Creating new vector database")
    documents = loader.load()
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    texts = text_splitter.split_documents(documents)
    os.makedirs(persist_directory)
    vectordb = Chroma.from_documents(documents=texts, 
                                     embedding=embedding,
                                     persist_directory=persist_directory)
else:
    print("Loading existing vector database")
    vectordb = Chroma(persist_directory=persist_directory,
                      embedding_function=embedding)

retriever = vectordb.as_retriever(search_kwargs={"k": 2})

print("Vector database is ready")

prompt = hub.pull("rlm/rag-prompt")

def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)

rag_chain_3 = (
    {"context": retriever | format_docs, "question": RunnablePassthrough()}
    | prompt
    | llm_3
    | StrOutputParser()
)

rag_chain_4 = (
    {"context": retriever | format_docs, "question": RunnablePassthrough()}
    | prompt
    | llm_3
    | StrOutputParser()
)

prompt_template = """
[INST] 
Use the following context to Answer the question at the end. Do not use any other information. If you can't find the relevant information in the context, just say you don't have enough information to answer the question. Don't try to make up an answer.


{context}

Question: {question} [/INST]
"""

llama_prompt = PromptTemplate(template=prompt_template, input_variables=["context", "question"])

rag_chain_llama = (
    {"context": retriever | format_docs, "question": RunnablePassthrough()}
    | prompt
    | llama
    | StrOutputParser()
)

rag_chain_falcon = (
    {"context": retriever | format_docs, "question": RunnablePassthrough()}
    | llama_prompt
    | falcon
    | StrOutputParser()
)

print("RAG FastAPI server is ready")

async def stream_output(chain, query, websocket: WebSocket):
    async for chunk in chain.astream(query):
        if answer_chunk := chunk:
            await websocket.send_text(answer_chunk)

@app.websocket("/ws/gpt-3")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            query = json.loads(data).get("query")

            
            await stream_output(rag_chain_3, query, websocket)
            
    except WebSocketDisconnect:
        print("Client disconnected")

@app.websocket("/ws/gpt-4")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            query = json.loads(data).get("query")

            
            await stream_output(rag_chain_4, query, websocket)
           
    except WebSocketDisconnect:
        print("Client disconnected")

@app.websocket("/ws/llama")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            query = json.loads(data).get("query")

            
            await stream_output(rag_chain_llama, query, websocket)
           
    except WebSocketDisconnect:
        print("Client disconnected")

@app.websocket("/ws/falcon")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            query = json.loads(data).get("query")

            
            await stream_output(rag_chain_falcon, query, websocket)
           
    except WebSocketDisconnect:
        print("Client disconnected")
