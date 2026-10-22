# Hamtry-г Cloudflare дээр ажиллуулах

`main` салбар руу push хийхэд **Deploy Hamtry to Cloudflare** workflow frontend-ийн
lint, test, build-ийг шалгаад Worker болон static файлуудыг байршуулна.
GitHub repository-ийн `CLOUDFLARE_API_TOKEN` secret нь deployment эрхийг хадгална.
Түлхүүрийг код болон log-д бичиж болохгүй.

Хаяг: **https://hamtry.23b1num3285.workers.dev**.

Theme editor-ийг local дээр ашиглан Save хийгээд `theme/hamtry-theme.json`-ийг
Git-ээр шинэчилнэ. Нийтийн сайтад theme бичих үйлдэл болон editor хаалттай.

Selfie шалгах Python/DeepFace service нь **VPS дээр хэвээр**. Cloudflare-ийн
`/api/liveness/*` зам тийш хүсэлтийг дамжуулна. Тиймээс VPS-ийг одоохондоо
унтрааж болохгүй. ML service-ийг бүхэлд нь шилжүүлэхэд тусдаа runtime болон
зардлыг шийдэх шаардлагатай. Spring/PostgreSQL scaffold мөн VPS дээр үлдсэн.

Өмнөх **VPS maintenance deployment** workflow зөвхөн гараар ажиллана;
`main` push нь VPS deployment эхлүүлэхгүй. Hostinger-ийн хуучин хаяг хэвээр.
Custom domain-ийг Cloudflare-д тусад нь холбох шаардлагатай.

Local шалгах: `Front-End/client` дотроос `npm test`, `npm run lint`,
`npm run build`, `npx wrangler deploy --dry-run`.
`npm run preview:cloudflare` нь Worker-ийг local дээр ажиллуулна.
Зар, зураг, profile-ийн demo мэдээлэл browser дотроо хэвээр.
