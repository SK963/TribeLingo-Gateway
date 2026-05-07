import { Router } from "express";

import { authRouter } from "./modules/auth/router";
import { docsRouter } from "./modules/docs/router";
import { userRouter } from "./modules/user/router";
import { translationRouter } from "./modules/translation/router";
import { posRouter } from "./modules/pos/router";
import { chatbotRouter } from "./modules/chatbot/router";
import { savedRouter } from "./modules/saved/router";
import { dictionaryRouter } from "./modules/dictionary/router";

export const apiRouter = Router();

apiRouter.use("/", docsRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/users", userRouter);
apiRouter.use("/translation", translationRouter);
apiRouter.use("/pos", posRouter);
apiRouter.use("/chat", chatbotRouter);
apiRouter.use("/saved", savedRouter);
apiRouter.use("/dictionary", dictionaryRouter);


