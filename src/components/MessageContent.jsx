
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import CodeBlock from "./CodeBlock";

export default function MessageContent({ content }) {
  if (content === null || content === undefined || content === "") {
    return null;
  }

  if (typeof content !== "string") {
    return <span>{JSON.stringify(content)}</span>;
  }

  const cleaned = content.replace(
    /\{"id":\s*"[^"]*",\s*"role":\s*"[^"]*"\}/g,
    ""
  );

  return (
    <div className="message-markdown" dir="auto">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          h1: ({ children }) => <h1 className="md-h1">{children}</h1>,
          h2: ({ children }) => <h2 className="md-h2">{children}</h2>,
          h3: ({ children }) => <h3 className="md-h3">{children}</h3>,

          p: ({ children }) => <p className="md-paragraph">{children}</p>,

          ul: ({ children }) => <ul className="md-list">{children}</ul>,
          ol: ({ children }) => <ol className="md-list md-ordered-list">{children}</ol>,
          li: ({ children }) => <li>{children}</li>,

          blockquote: ({ children }) => (
            <blockquote className="md-blockquote">{children}</blockquote>
          ),

          table: ({ children }) => (
            <div className="md-table-wrapper">
              <table className="md-table">{children}</table>
            </div>
          ),

          thead: ({ children }) => <thead>{children}</thead>,
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => <tr>{children}</tr>,
          th: ({ children }) => <th>{children}</th>,
          td: ({ children }) => <td>{children}</td>,

          a: ({ href, children }) => {
            const safeHref =
              typeof href === "string" &&
              /^(https?:\/\/|mailto:)/i.test(href)
                ? href
                : undefined;

            return (
              <a
                href={safeHref}
                target={safeHref ? "_blank" : undefined}
                rel={safeHref ? "noopener noreferrer" : undefined}
              >
                {children}
              </a>
            );
          },

          code: ({ className, children, ...props }) => {
            const match = /language-([\w-]+)/.exec(className || "");
            const code = String(children).replace(/\n$/, "");

            if (match) {
              return (
                <CodeBlock
                  lang={match[1]}
                  content={code}
                />
              );
            }

            return (
              <code className="md-inline-code" {...props}>
                {children}
              </code>
            );
          },

          pre: ({ children }) => <>{children}</>,

          hr: () => <hr className="md-divider" />,

          strong: ({ children }) => <strong>{children}</>,
          em: ({ children }) => <em>{children}</>,
          del: ({ children }) => <del>{children}</>,
        }}
      >
        {cleaned}
      </ReactMarkdown>
    </div>
  );
}
