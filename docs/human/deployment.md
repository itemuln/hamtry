# Hamtry-г VPS дээр ажиллуулах

`main` салбар руу push хийхэд GitHub Actions frontend-ийн lint, test, build,
backend-ийн PostgreSQL-тэй тест болон build-ийг шалгаад VPS рүү хувилбарыг
илгээнэ. Эхний удаа серверийн тохиргоо болон GitHub secret-үүдийг бэлдэнэ.

Хаяг: **https://hamtry.srv1869478.hstgr.cloud**.

[VPS тохиргооны дэлгэрэнгүй заавар](../../infrastructure/production/README.md).

Frontend, backend, database нь KoreaBox болон HiLiving-ээс тусдаа service,
хавтас, порт ашиглана. Шинэ хувилбарын health шалгалт амжилтгүй бол өмнөх
хувилбарыг буцааж идэвхжүүлнэ. Хадгалсан theme нь хувилбар шинэчлэхэд үлдэнэ.

Theme editor одоогоор нэвтрэх хамгаалалтгүй тул public сайт дээр theme бичих
үйлдлийг хааж, editor хуудсыг нуусан. Local editor эсвэл SSH tunnel ашиглан
Save хийж болно. Зар, зураг, profile-ийн demo мэдээлэл browser дотороо хэвээр;
VPS байршуулалт нь жинхэнэ account болон marketplace API үүсгэхгүй.
