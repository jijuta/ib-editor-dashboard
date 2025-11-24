This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

/www/ib-poral/scripts/incident-ti-lookup-v3.ts
/www/ib-poral/scripts/incident-ti-lookup-v4-ai.ts
두 파일과 관련 된 파이일을
/www/ib-editor/my-app/script 로 복사해서 실행 및 테스트 해줘
테스트 하면서 오류가 있으면 자동으로 검사하고 완료 될때 까지 진행해줘
참고자료는 아래와 같아 
인시던트는 /www/ib-editor/my-app/data/data.csv 의 인시던트 아이디를 이용해서 테스트 해주고
인덱스구조는 /www/ib-editor/my-app/docs/OpenSearch_Index_List.md 이걸 참고해서 진행해 

AIzaSyAPYop7mSPAZiCuPpSm9nEccnjjsPoFHNg

curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent" \
  -H 'Content-Type: application/json' \
  -H 'X-goog-api-key: AIzaSyAPYop7mSPAZiCuPpSm9nEccnjjsPoFHNg' \
  -X POST \
  -d '{
    "contents": [
      {
        "parts": [
          {
            "text": "Explain how AI works in a few words"
          }
        ]
      }
    ]
  }'
