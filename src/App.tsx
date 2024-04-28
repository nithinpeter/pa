import { useRef, useState, useEffect } from "react";
import { BotMessageSquare, CircleUserRound, Ellipsis } from "lucide-react";

const BASE_URL = "http://127.0.0.1:11434";

async function* talkToOllama(prompt: string) {
  try {
    const response = await fetch(`${BASE_URL}/api/generate`, {
      body: JSON.stringify({
        model: "llama3:instruct",
        prompt,
        stream: true,
      }),
      method: "post",
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      const chunk = decoder.decode(value);
      const lines = chunk.split("\n");

      const parsedLines = lines
        .filter(Boolean)
        .map(JSON.parse)
        .map(({ response }) => response);

      yield parsedLines;
    }

    return;
  } catch (e) {
    // debugger;
  }
}

type Content = {
  who: "ai" | "human";
  timestamp: number;
  text: string;
};

function App() {
  const [content, setContent] = useState<Content[]>([]);
  const [isLoading, setIsLoading] = useState<boolean[]>(false);
  const [prompt, setPrompt] = useState<string>("");
  const scrollToBottomRef = useScrollToBottom(content.at(-1)?.text.length);

  const handleSubmit = async () => {
    if (prompt?.trim() == "") {
      return;
    }

    setIsLoading(true);

    setContent((content) => [
      ...content,
      {
        who: "human",
        text: prompt || "",
        timestamp: Date.now(),
      },
    ]);

    let text = "";
    let next;
    const job = talkToOllama(prompt);
    setPrompt("");

    while (!(next = await job.next()).done) {
      text += next.value;

      setContent((content) => {
        const [last] = content.slice(-1);
        const rest = content.slice(0, content.length - 1);

        if (last.who == "ai") {
          return [
            ...rest,
            {
              who: "ai",
              text,
              timestamp: Date.now(),
            },
          ];
        } else {
          return [
            ...rest,
            last,
            {
              who: "ai",
              text,
              timestamp: Date.now(),
            },
          ];
        }
      });
    }

    setIsLoading(false);
  };

  return (
    <div className="flex h-screen flex-col w-96 m-auto border border-slate-200 ">
      <header className="p-4 border-b border-cyan-200 text-cyan-500 flex">
        <h1 className="text-5xl">p.a</h1>™
      </header>
      <main className="flex flex-1 flex-col overflow-auto">
        <div className="flex-1 p-4 overflow-y-scroll">
          {content.map((c, index) => (
            <div key={index} className="flex">
              <span className="h-8 w-8 pr-2">
                {c.who == "ai" ? <BotMessageSquare /> : <CircleUserRound />}
              </span>
              <span>{c.text}</span>
            </div>
          ))}
          <div ref={scrollToBottomRef}></div>
        </div>
        {isLoading && (
          <div className="animate-pulse flex justify-center text-slate-600">
            <Ellipsis />
          </div>
        )}
        <input
          value={prompt}
          onChange={(e) => {
            if (!isLoading) {
              setPrompt(e.target.value);
            }
          }}
          type="text"
          placeholder="Ask me anything.."
          className="border border-slate-400 text-lg px-2 py-2 rounded-md"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
      </main>
    </div>
  );
}

const useScrollToBottom = (trigger: number) => {
  const endRef = useRef<null | HTMLDivElement>(null);

  const scrollToBottom = () => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [trigger]);

  return endRef;
};

export default App;
