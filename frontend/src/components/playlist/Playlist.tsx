/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import "./Playlist.scss";
import { type Tool, SchemaType } from "@google/generative-ai";
import { useEffect, useState, useCallback, memo } from "react";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import {
  ToolCall,
  ToolResponse,
  LiveFunctionResponse,
} from "../../multimodal-live-types";
import { List, ListProps } from "./List";
import { Chips } from "./Chips";

// Types
interface CreateListArgs {
  id: string;
  heading: string;
  list_array: string[];
}
interface EditListArgs extends CreateListArgs {}
interface RemoveListArgs {
  id: string;
}
interface ResponseObject extends LiveFunctionResponse {
  name: string;
  response: { result: object };
}


// Chips
// Scan album artwork or concert posters with your camera to identify the artist, genre, and related songs.
const INITIAL_SCREEN_CHIPS = [
  { 
    label: "🎧 Create a playlist based on your mood.",
    message: "Analyze the users mood based on their selfie. If no selfie is provided, kindly request one without making assumptions. Once the selfie is received, analyze the mood and suggest at least one playlist with 5 songs or music tracks based on it before asking any further questions." 
  },
  {
    label: "🎻 Create a playlist based on your surroundings.",
    message: "Analyze the users surroundings based on the provided image or video. If no image or video of the surroundings is provided, kindly request one without making assumptions. Once the surroundings are received, suggest at least one playlist with 5 songs or music tracks based on the users environment, and refrain from asking any questions unrelated to music.",
  },
  {
    label: "🎸 Identify the song based on your melody and create a playlist with similar tracks.",
    message: "Please listen to the users humming or singing and identify the song based on the melody. Create a playlist with at least 5 songs or music tracks similar to the identified song. Refrain from asking any questions unrelated to music.",
  },
  { 
    label: "🕺🏻 Identify the artist, genre, and related songs based on scanned album artwork or concert posters", 
    message: "Analyze the image provided by the user. If no image or video is provided, kindly request one. Based on the picture, identify the artist, genre, and suggest at least one playlist with 5 related songs or music tracks." 
  },
];

const LIST_SCREEN_CHIPS = [
  {
    label: "💃🏼 Add more songs",
    message: "Add more songs to playlist",
  },
  {
    label: "✨ Organise into categories",
    message: "Organise it into categories",
  },
  {
    label: "💫 Break into separate playlists",
    message: "Break it down into separate playlists",
  },
  { label: "🪄 Clear and start again", message: "Clear and start again" },
];

function PlaylistComponent() {
  const { client, connect, connected } = useLiveAPIContext();

  const [isAwaitingFirstResponse, setIsAwaitingFirstResponse] = useState(false);
  const [initialMessage, setInitialMessage] = useState("");
  const [listsState, setListsState] = useState<ListProps[]>([]);
  const [toolResponse, setToolResponse] = useState<ToolResponse | null>(null);

  // Update existing list
  const updateList = useCallback((listId: string, updatedList: string[]) => {
    setListsState((prevLists) =>
      prevLists.map((list) => {
        if (list.id === listId) {
          return { ...list, list_array: updatedList };
        } else {
          return list;
        }
      })
    );
  }, []);

  // Scroll to new list after timeout
  const scrollToList = (id: string) => {
    setTimeout(() => {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }, 100);
  };

  const handleCheckboxChange = useCallback((listId: string, index: number) => {
    setListsState((prevLists) =>
      prevLists.map((list) => {
        if (list.id === listId) {
          const updatedList = [...list.list_array];
          const item = updatedList[index];
          
          // Regex to match a URL within the item
          const urlRegex = /\[.*?\]\((https?:\/\/[^\s]+)\)/;
          const match = item.match(urlRegex);
          
          if (match && match[1]) {
            // Open the URL in a new window
            window.open(match[1], "_blank");
          }
          
          return list; // No changes to the state needed for this action
        }
        return list;
      })
    );
  }, []);
  

  useEffect(() => {
    const onToolCall = (toolCall: ToolCall) => {
      const fCalls = toolCall.functionCalls;
      const functionResponses: ResponseObject[] = [];

      if (fCalls.length > 0) {
        fCalls.forEach((fCall) => {
          let functionResponse = {
            id: fCall.id,
            name: fCall.name,
            response: {
              result: { string_value: `${fCall.name} OK.` },
            },
          };
          switch (fCall.name) {
            case "look_at_lists": {
              break;
            }
            case "edit_list": {
              const args = fCall.args as EditListArgs;
              updateList(args.id, args.list_array);
              break;
            }
            case "remove_list": {
              const args = fCall.args as RemoveListArgs;
              setListsState((prevLists) =>
                prevLists.filter((list) => list.id !== args.id)
              );
              break;
            }
            case "create_list": {
              const args = fCall.args as EditListArgs;
              const newList: ListProps = {
                id: args.id,
                heading: args.heading,
                list_array: args.list_array,
                onListUpdate: updateList,
                onCheckboxChange: handleCheckboxChange,
              };
              setListsState((prevLists) => {
                const updatedLists = [...prevLists, newList];
                return updatedLists;
              });
              scrollToList(newList.id);
              break;
            }
          }
          if (functionResponse) {
            functionResponses.push(functionResponse);
          }
        });

        // Send tool responses back to the model
        const toolResponse: ToolResponse = {
          functionResponses: functionResponses,
        };
        setToolResponse(toolResponse);
      }
    };
    setIsAwaitingFirstResponse(false);
    client.on("toolcall", onToolCall);
    return () => {
      client.off("toolcall", onToolCall);
    };
  }, [client, handleCheckboxChange, updateList]);

  useEffect(() => {
    if (toolResponse) {
      const updatedToolResponse: ToolResponse = {
        ...toolResponse,
        functionResponses: toolResponse.functionResponses.map(
          (functionResponse) => {
            const responseObject = functionResponse as ResponseObject;
            if (responseObject.name === "look_at_lists") {
              return {
                ...functionResponse,
                response: {
                  result: {
                    object_value: listsState,
                  },
                },
              };
            } else {
              return functionResponse;
            }
          }
        ),
      };
      client.sendToolResponse(updatedToolResponse);
      setToolResponse(null);
    }
  }, [toolResponse, listsState, client, setToolResponse]);

  const connectAndSend = async (message: string) => {
    setIsAwaitingFirstResponse(true);
    if (!connected) {
      try {
        await connect();
      } catch (error) {
        throw new Error("Could not connect to Websocket");
      }
    }
    client.send({
      text: `${message}`,
    });
  };

  //   Rendered if list length === 0
  const renderInitialScreen = () => {
    return (
      <>
        {/* Hide while connecting to API */}
        {!isAwaitingFirstResponse && (
          <div className="initial-screen">
            <div className="spacer"></div>
            <h1>🎶 Create a playlist based on:</h1>
            <input
              type="text"
              value={initialMessage}
              className="initialMessageInput"
              placeholder="type or say something..."
              onChange={(e) => setInitialMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  connectAndSend(`Start a list about: ${initialMessage}`);
                }
              }}
            />
            <div className="spacer"></div>
            <Chips
              title={"How about:"}
              chips={INITIAL_SCREEN_CHIPS}
              onChipClick={(message) => {
                connectAndSend(`How about: ${message}`);
              }}
            />
            <div className="spacer"></div>
          </div>
        )}
      </>
    );
  };

  //   Rendered if list length > 0
  const renderListScreen = () => {
    return (
      <>
        <div className="list-screen">
          {listsState.map((listData) => (
            <List
              key={listData.id}
              id={listData.id}
              heading={listData.heading}
              list_array={listData.list_array}
              onListUpdate={updateList}
              onCheckboxChange={handleCheckboxChange}
            />
          ))}
          <Chips
            title={"Try saying:"}
            chips={LIST_SCREEN_CHIPS}
            onChipClick={(message) => {
              client.send({ text: message });
            }}
          />
        </div>
      </>
    );
  };

  return (
    <div className="app">
      {listsState.length === 0 ? renderInitialScreen() : renderListScreen()}
    </div>
  );
}

export const Playlist = memo(PlaylistComponent);
