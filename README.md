# LexiLift

LexiLift is an AI-powered document ingestion and RAG (Retrieval-Augmented Generation) chat platform. It allows organizations to upload their knowledge base (PDFs, Word documents, text files, and Markdown) and immediately deploy an intelligent, embeddable chat widget to their websites. 

With multi-LLM support, you can switch between OpenAI GPT-4o, Anthropic Claude 3.5 Sonnet, and Google Gemini 1.5 Pro to power your AI assistant, all backed by a high-performance vector search pipeline.

## Local development

```bash
npm install
cp .env.example .env.local  # fill in keys
npm run dev:all             # starts Supabase + Inngest + Next.js concurrently
npm run seed                # seeds 1 starter + 1 pro org
```

Open [http://localhost:3000](http://localhost:3000). The Inngest dev UI is at [http://localhost:8288](http://localhost:8288).

## 🚀 Features

- **Multi-Tenant Architecture**: Robust organization and user management with Supabase.
- **Document Ingestion Pipeline**: 
  - Drag-and-drop file uploads (PDF, DOCX, TXT, MD).
  - Automated text extraction, LangChain chunking, and vector embedding.
- **Advanced RAG Engine**: 
  - Pinecone vector database for hybrid search.
  - Voyage AI for state-of-the-art context reranking.
- **Multi-LLM Adapter**: Seamlessly switch between OpenAI, Anthropic, and Gemini models.
- **Embeddable Chat Widget**: A lightweight, customizable iframe widget that can be dropped into any website, secured by domain whitelisting and API tokens.
- **Integrated Billing**: Subscriptions and usage tracking powered by Polar.sh.
- **Modern UI/UX**: Built with Next.js App Router, Tailwind CSS, and shadcn/ui.

## 🛠️ Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL) + [Drizzle ORM](https://orm.drizzle.team/)
- **Vector Store**: [Pinecone](https://www.pinecone.io/)
- **AI / LLMs**: [Vercel AI SDK](https://sdk.vercel.ai/docs), OpenAI, Anthropic, Google Gemini
- **Reranking**: [Voyage AI](https://www.voyageai.com/)
- **Billing**: [Polar.sh](https://polar.sh/)
- **Emails**: [Resend](https://resend.com/)
- **Styling**: Tailwind CSS + shadcn/ui + Lucide Icons

## ⚙️ Quick Start

### 1. Clone the repository
\`\`\`bash
git clone https://github.com/yourusername/lexilift.git
cd lexilift
\`\`\`

### 2. Install dependencies
\`\`\`bash
npm install
\`\`\`

### 3. Environment Variables
Copy the example environment file and fill in your API keys:
\`\`\`bash
cp .env.example .env.local
\`\`\`

You will need accounts/keys for:
- Supabase (Project URL, Anon Key, Service Role Key, Database URL)
- Pinecone (API Key and Index name)
- OpenAI & Voyage AI
- Polar.sh (Access Token & Webhook Secret)
- Resend (API Key)

### 4. Database Setup
Push the Drizzle schema to your Supabase PostgreSQL database:
\`\`\`bash
npx drizzle-kit push
\`\`\`

*(Note: Ensure you have run the provided RLS policies SQL script in your Supabase SQL editor to secure your tables.)*

### 5. Run the Development Server
\`\`\`bash
npm run dev
\`\`\`
Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## 📝 Usage

1. **Sign Up / Log In**: Create an account and an organization.
2. **Upload Documents**: Navigate to the "Documents" tab and upload your knowledge base.
3. **Configure Settings**: Go to "Settings" to select your preferred LLM model.
4. **Deploy Widget**: Go to the "Widget" tab, customize your colors and greeting, add your website's domain to the whitelist, and copy the embed code into your website's HTML.

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the issues page.

## 📜 License
This project is licensed under the MIT License.
