import React, { useEffect, useReducer, useState } from "react";
import Head from "next/head";
import { Header } from "../../src/components/Header";
import Dexie from "dexie";
import { Presentation } from "../../src/types";
import { useRouter } from "next/dist/client/router";
import { SlideView } from "../../src/components/SlideView";
import {
  createInitialState,
  PresentationActionType,
  PresentationReducer,
} from "../../src/reducers/PresentationReducer";
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from "@material-ui/core";
import GetAppIcon from "@material-ui/icons/GetApp";
import { createVideo, download } from "../../src/Utils";

export default function Presentations() {
  const router = useRouter();
  const [state, dispatch] = useReducer(
    PresentationReducer,
    createInitialState()
  );
  const { presentation, selectedSlideUid } = state;
  const selectedSlide = presentation?.slides.find(
    (slide) => slide.uid === selectedSlideUid
  );

  const [isOpenedMenu, setIsOpenedMenu] = useState(false);

  useEffect(() => {
    const splited = location.pathname.split("/");
    const id = splited[splited.length - 1];
    if (id && typeof id === "string") {
      const parsedId = parseInt(id);

      (async () => {
        const db = new Dexie("montage");
        db.version(1).stores({
          presentations: "++id, title, slides",
        });

        const presentation = await db
          .table<Presentation>("presentations")
          .get(parsedId);

        if (!presentation) {
          router.replace("/404");
          return Promise.resolve();
        }
        dispatch({
          type: PresentationActionType.SET_STATE,
          state: {
            presentation,
            selectedSlideUid: presentation.slides[0]?.uid,
          },
        });
      })();
    } else {
      router.replace("/404");
    }
  }, []);

  return (
    <>
      <Head>
        <title>Presentation {}</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Header
        isShowMenu={true}
        onClickMenu={() => setIsOpenedMenu(!isOpenedMenu)}
      />
      <Drawer
        anchor="left"
        open={isOpenedMenu}
        onClose={() => setIsOpenedMenu(false)}
      >
        <List>
          <ListItem
            button
            onClick={async () => {
              if (state.presentation) {
                const audios: Blob[] = [];
                const durations: number[] = [];
                const imageFiles: File[] = [];
                for (const slide of state.presentation.slides) {
                  imageFiles.push(slide.image);
                  for (const audio of slide.audios) {
                    if (audio.uid === slide.selectedAudioUid) {
                      audios.push(audio.blob);
                      durations.push(audio.durationMillisec);
                      break;
                    }
                  }
                }

                const videoBlob = await createVideo(
                  imageFiles,
                  audios,
                  durations
                );
                const url = URL.createObjectURL(videoBlob);
                download(url, "New Presentation");
              }
            }}
          >
            <ListItemIcon>
              <GetAppIcon />
            </ListItemIcon>
            <ListItemText primary="ビデオを書き出す" />
          </ListItem>
        </List>
      </Drawer>
      {presentation && selectedSlide && (
        <div
          style={{
            display: "flex",
            height: "calc(100vh - 64px)",
          }}
        >
          <div
            style={{
              width: "240px",
              height: "100%",
              overflow: "auto",
              flexShrink: 0,
              flexBasis: "240px",
            }}
          >
            {presentation.slides.map((slide) => {
              return (
                <button
                  type="button"
                  onClick={() => {
                    dispatch({
                      type: PresentationActionType.SET_STATE,
                      state: { selectedSlideUid: slide.uid },
                    });
                  }}
                >
                  <img src={URL.createObjectURL(slide.image)} />
                </button>
              );
            })}
          </div>
          <div style={{ flexGrow: 1 }}>
            <SlideView
              slide={selectedSlide}
              dispatch={dispatch}
              state={state}
            />
          </div>
        </div>
      )}
    </>
  );
}