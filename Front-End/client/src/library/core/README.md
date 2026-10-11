# Hamtry framework internals

Энэ хавтас нь сангийн signal engine, DOM helper, Web Component суурь class-ийг
агуулна. Хуудас код нь public `@hamtry/library` импорт ашиглана. Дотоод модулиуд
өөрийн шууд dependency-г импортлож, public barrel руу эргэж импортлохгүй.

- [Хүний унших заавар](../../../../../docs/human/README.md)
- [State болон DOM helper](../../../../../docs/human/state-and-dom.md)
- [Class, Shadow DOM, lifecycle](../../../../../docs/human/class-guide.md)
- [Agent API contract](../../../../../docs/agents/api-contract.md)
- [Agent architecture](../../../../../docs/agents/architecture.md)

Runtime-ийн unit test нь browser шаардахгүй engine модулийг шууд импортлоно.
Public library entry нь browser орчинд ажиллана.
