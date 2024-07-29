import { createEffect, createSignal, For, Match, on, Show, Switch } from 'solid-js'
import { boxed } from '@syncedstore/core'
import { useNdnWorkspace } from '../../Context'
import { chats } from '../../backend/models'
import { createSyncedStoreSig } from '../../adaptors/solid-synced-store'
import styles from './styles.module.scss'
import { useNavigate } from '@solidjs/router'
import { Chip, IconButton, Input } from '@suid/material'
import { Add as AddIcon, Remove as RemoveIcon } from '@suid/icons-material'
// TODO: Do not load all messages at once
// TODO: Support Markdown

export function Chat() {
  const { rootDoc, syncAgent, booted } = useNdnWorkspace()!
  const navigate = useNavigate()
  const messages = createSyncedStoreSig(() => rootDoc()?.chats)
  const data = () => messages()?.value
  const username = () => syncAgent()?.nodeId.at(-1).text ?? ''

  const [messageTerm, setMessageTerm] = createSignal('')
  const [container, setContainer] = createSignal<HTMLDivElement>()

  const [currentChannel, setCurrentChannel] = createSignal('') // starts on no channel
  const [isEditingChannel, setEdittingChannel] = createSignal(false) // starts on not editting anything
  const [channelName, setChannelName] = createSignal('') // starts on empty

  // const channels = ['general', 'paper_writing', 'code_discussion', 'help'] // Define your channels here
  const channelsSync = createSyncedStoreSig(() => rootDoc()?.chats_channels)
  const channels = () => channelsSync()?.value

  if (!booted()) {
    navigate('/profile', { replace: true })
  }

  const handleSubmit = () => {
    data()?.push(
      boxed({
        sender: username(),
        content: messageTerm(),
        timestamp: Date.now(),
        channel: currentChannel(),
      } satisfies chats.Message),
    )
    setMessageTerm('')
  }

  /* Create new channels */
  const addChannel = (name: string) => {
    if (!channels()?.includes(name)) {
      channels()?.push(name)
    }
    setCurrentChannel(name)
  }

  const handleAddChannel = () => {
    setEdittingChannel(!isEditingChannel())

    if (isEditingChannel()) {
      document.getElementById('channel_input')?.focus() // Focus on the input
    }
  }

  const handleSubmitChannel = (e: KeyboardEvent, name: string) => {
    if (e.key === 'Enter') {
      addChannel(name)
      setEdittingChannel(false)
      setChannelName('')
    }
  }

  const removeChannel = (channel: string) => {
    const idx = channels()?.indexOf(channel)
    if (idx == -1 || idx == undefined) return
    else {
      channels()?.splice(idx, 1)
    }
  }

  createEffect(
    on(data, () => {
      const div = container()
      if (div) {
        // NOTES: Xinyu: This looks strange but let's keep it.
        div.scrollTop = div.scrollHeight
      }
    }),
  )

  const filteredMessages = () => data()?.filter((msg) => msg.value.channel === currentChannel())

  return (
    <div class={styles.App}>
      <div class={styles.App_header}>
        <div>
          <For each={channels()}>
            {(channel) => (
              <Chip
                label={channel}
                color={channel === currentChannel() ? 'primary' : 'default'}
                onDelete={() => removeChannel(channel)}
                clickable={true}
                onClick={() => setCurrentChannel(channel)}
              />
            )}
          </For>
          <IconButton onClick={handleAddChannel}>
            <Switch>
              <Match when={!isEditingChannel()}>
                <AddIcon />
              </Match>
              <Match when={true}>
                <RemoveIcon />
              </Match>
            </Switch>
          </IconButton>
          <Show when={isEditingChannel()}>
            <Input
              id="channel_input"
              value={channelName()}
              autoComplete="true"
              disabled={!isEditingChannel()}
              onChange={(event) => setChannelName(event.target.value)}
              onKeyDown={(event) => handleSubmitChannel(event, channelName())}
            ></Input>
          </Show>
        </div>
        <Switch>
          <Match when={currentChannel() !== ''}>
            <h2 style={{ color: '#333' }}>#{currentChannel()} Channel</h2>
          </Match>
          <Match when={true}>
            <h2 style={{ color: '#333' }}>Please join or create any channel to start</h2>
          </Match>
        </Switch>
      </div>
      <div class={styles.App__messages} ref={setContainer}>
        <For each={filteredMessages()}>
          {(msg) => (
            <div class={msg.value.sender == username() ? styles.App__messageForeign : styles.App__messageLocal}>
              <div class={styles.App__message}>
                <img
                  src={
                    msg.value.sender == username()
                      ? 'https://picsum.photos/200/300?random=1'
                      : 'https://cdn.drawception.com/images/avatars/647493-B9E.png'
                  }
                />
                <div class={styles.App__msgContent}>
                  <h4>
                    {' '}
                    {msg.value.sender}
                    <span>{new Date(msg.value.timestamp).toDateString()}</span>
                  </h4>
                  <p> {msg.value.content} </p>
                </div>
              </div>
            </div>
          )}
        </For>
      </div>
      <Show when={currentChannel() !== ''}>
        <div class={styles.App__input}>
          <textarea
            name="message"
            placeholder={`Message the ${currentChannel()} channel`}
            onChange={(event) => setMessageTerm(event.target.value)}
            value={messageTerm()}
          />
          <button class={styles.App__button} onClick={handleSubmit}>
            Send
          </button>
        </div>
      </Show>
    </div>
  )
}
