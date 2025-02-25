/* eslint-disable no-unused-vars */
/* eslint-disable no-restricted-globals */
/* global createConversation, Sortable, deleteConversation, showNewChatPage, notSelectedClassList, deleteConversationOnDragToTrash */

function createFolder(folder, conversationTimestamp, conversations = [], isNewFolder = false) {
  // generate random uuid
  const folderId = folder.id;

  const folderElementWrapper = document.createElement('div');
  folderElementWrapper.id = `wrapper-folder-${folderId}`;
  folderElementWrapper.classList = 'flex w-full';
  folderElementWrapper.style = 'flex-wrap: wrap;';

  const folderElement = document.createElement('div');
  folderElement.id = `folder-${folderId}`;
  folderElement.classList = 'flex py-3 px-3 pr-3 w-full items-center gap-3 relative rounded-md hover:bg-[#2A2B32] cursor-pointer break-all hover:pr-14 group';
  // eslint-disable-next-line no-loop-func

  const folderIcon = document.createElement('img');
  folderIcon.classList = 'w-4 h-4';
  folderIcon.src = folder.isOpen ? chrome.runtime.getURL('icons/folder-open.png') : chrome.runtime.getURL('icons/folder.png');
  folderIcon.dataset.isOpen = folder.isOpen ? 'true' : 'false';
  folderElement.appendChild(folderIcon);

  const folderTitle = document.createElement('div');
  folderTitle.id = `title-folder-${folderId}`;
  folderTitle.classList = 'flex-1 text-ellipsis max-h-5 overflow-hidden break-all relative';
  folderTitle.innerHTML = folder.name;
  folderElement.title = folder.name;
  folderElement.appendChild(folderTitle);

  const folderContent = document.createElement('div');
  folderContent.id = `folder-content-${folderId}`;
  folderContent.classList = 'w-full ml-4 border-l border-gray-500';
  folderContent.style.borderBottomLeftRadius = '6px';
  folderContent.style.marginLeft = '16px';
  folderContent.style.display = folder.isOpen ? 'block' : 'none';
  if (folder.conversationIds.length > 0) {
    folder.conversationIds.forEach((conversationId) => {
      const conversation = conversations[conversationId];
      const conversationElement = createConversation(conversation, conversationTimestamp);
      folderContent.appendChild(conversationElement);
    });
  } else {
    folderContent.appendChild(emptyFolderElement(folderId));
  }

  folderElement.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    // get closet element with id starting with conversation-button
    chrome.storage.local.get(['conversationsOrder'], (result) => {
      const { conversationsOrder } = result;
      const folderElementId = e.srcElement.closest('[id^="folder-"]').id.split('folder-')[1];
      const curFolderIcon = document.querySelector(`#folder-${folderElementId} img`);
      curFolderIcon.src = chrome.runtime.getURL(`${curFolderIcon.dataset.isOpen === 'false' ? 'icons/folder-open.png' : 'icons/folder.png'}`);
      curFolderIcon.dataset.isOpen = curFolderIcon.dataset.isOpen === 'false' ? 'true' : 'false';
      const curFolderContent = document.querySelector(`#folder-content-${folderElementId}`);
      curFolderContent.style.display = folderContent.style.display === 'none' ? 'block' : 'none';
      conversationsOrder.find((c) => c.id === folderElementId).isOpen = curFolderIcon.dataset.isOpen === 'true';
      chrome.storage.local.set({ conversationsOrder });
    });
  });
  // action icons
  folderElement.appendChild(folderActions(folderId));

  // add checkbox
  // addCheckboxToConversationElement(conversationElement, conversation);
  const sortable = new Sortable(folderContent, {
    draggable: '[id^="conversation-button-"]',
    group: {
      name: folderId,
      // eslint-disable-next-line func-names, object-shorthand
      pull: function (to, from, dragged) {
        return from.el.id !== 'folder-content-trash';
      },
      // eslint-disable-next-line func-names, object-shorthand
      put: function (to, from, dragged) {
        return !dragged.id.startsWith('wrapper-folder-');
      },
    },
    onEnd: (event) => {
      const {
        item, to, from, oldIndex, newIndex, oldDraggableIndex, newDraggableIndex,
      } = event;
      const itemId = item.id.split('conversation-button-')[1];
      const isFolder = item.id.startsWith('wrapper-folder-');
      const isToFolder = to.id.startsWith('folder-content-');
      const fromId = from.id.split('folder-content-')[1];
      const toId = isToFolder ? to.id.split('folder-content-')[1] : 'conversation-list';
      if (oldDraggableIndex === newDraggableIndex && toId === fromId) return;

      chrome.storage.local.get(['conversationsOrder'], (result) => {
        const { conversationsOrder } = result;
        const fromFolderIndex = conversationsOrder.findIndex((c) => c.id === fromId);
        const fromFolder = conversationsOrder[fromFolderIndex];
        fromFolder.conversationIds.splice(oldDraggableIndex, 1);
        if (fromFolder.conversationIds.length === 0) {
          from.appendChild(emptyFolderElement(folderId));
        }
        if (isToFolder) {
          const curEmptyFolder = document.querySelector(`#empty-folder-${toId}`);
          if (curEmptyFolder) curEmptyFolder.remove();
          const toFolderIndex = conversationsOrder.findIndex((c) => c.id === toId);
          const toFolder = conversationsOrder[toFolderIndex];
          toFolder.conversationIds.splice(newDraggableIndex, 0, itemId);
          conversationsOrder.splice(toFolderIndex, 1, toFolder);
          if (!isFolder && toId === 'trash' && fromId !== 'trash') {
            deleteConversationOnDragToTrash(itemId);
          }
        } else {
          conversationsOrder.splice(newIndex - 1, 0, itemId); // if adding to conversation list use index-1(for search box)
        }

        chrome.storage.local.set({ conversationsOrder });
      });
    },
  });
  folderElementWrapper.appendChild(folderElement);
  folderElementWrapper.appendChild(folderContent);
  if (isNewFolder) {
    const editFolderNameButton = folderElementWrapper.querySelector(`#edit-folder-name-${folderId}`);
    editFolderNameButton.click();
  }
  return folderElementWrapper;
}
function emptyFolderElement(folderId) {
  const emptyFolder = document.createElement('div');
  emptyFolder.id = `empty-folder-${folderId}`;
  emptyFolder.classList = 'flex w-full p-3 text-xs text-gray-500';
  emptyFolder.innerHTML = folderId === 'trash'
    ? 'No Archived Conversation.<br/>Deleted chats will be moved here.'
    : 'Empty folder.<br/>Drag conversations to add';
  return emptyFolder;
}
function folderActions(folderId) {
  const actionsWrapper = document.createElement('div');
  actionsWrapper.id = `actions-wrapper-${folderId}`;
  actionsWrapper.classList = 'absolute flex right-1 z-10 text-gray-300 invisible group-hover:visible';
  const editFolderNameButton = document.createElement('button');
  editFolderNameButton.id = `edit-folder-name-${folderId}`;
  editFolderNameButton.classList = 'p-1 hover:text-white';
  editFolderNameButton.innerHTML = '<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>';
  editFolderNameButton.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    chrome.storage.local.get(['conversationsOrder'], (result) => {
      const { conversationsOrder } = result;
      const textInput = document.createElement('input');
      const folderTitle = document.querySelector(`#title-folder-${folderId}`);
      textInput.id = `rename-folder-${folderId}`;
      textInput.classList = 'border-0 bg-transparent p-0 focus:ring-0 focus-visible:ring-0';
      textInput.style = 'max-width:140px;';
      textInput.value = conversationsOrder.find((conv) => conv.id === folderId).name;
      folderTitle.parentElement.replaceChild(textInput, folderTitle);
      textInput.focus();
      textInput.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        textInput.focus();
      });
      // replace action buttons with save and cancel buttons
      actionsWrapper.replaceWith(folderConfirmActions(conversationsOrder.find((conv) => conv.id === folderId), 'edit'));
    });
  });
  const deleteFolderButton = document.createElement('button');
  deleteFolderButton.classList = 'p-1 hover:text-white';
  deleteFolderButton.innerHTML = '<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>';
  deleteFolderButton.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    chrome.storage.local.get(['conversationsOrder'], (result) => {
      const { conversationsOrder } = result;
      actionsWrapper.replaceWith(folderConfirmActions(conversationsOrder.find((conv) => conv.id === folderId), 'delete'));
    });
    // remove all other visible cancel buttons
    // get all cancel buttons with last part of id not equal to this conversation id and click on them
    const cancelButtons = document.querySelectorAll(`button[id^="cancel-"]:not(#cancel-${folderId})`);
    cancelButtons.forEach((button) => {
      button.click();
    });
  });
  if (folderId !== 'trash') {
    actionsWrapper.appendChild(editFolderNameButton);
  }
  actionsWrapper.appendChild(deleteFolderButton);
  return actionsWrapper;
}
function folderConfirmActions(folder, action) {
  let skipBlur = false;
  const folderElement = document.querySelector(`#folder-${folder.id}`);
  folderElement.classList.replace('pr-3', 'pr-14');
  const actionsWrapper = document.createElement('div');
  actionsWrapper.id = `actions-wrapper-${folder.id}`;
  actionsWrapper.classList = 'absolute flex right-1 z-10 text-gray-300';
  const confirmButton = document.createElement('button');
  confirmButton.id = `confirm-${folder.id}`;
  confirmButton.classList = 'p-1 hover:text-white';
  confirmButton.innerHTML = '<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><polyline points="20 6 9 17 4 12"></polyline></svg>';
  confirmButton.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (action === 'edit') {
      const textInput = document.querySelector(`#rename-folder-${folder.id}`);
      const folderTitle = document.createElement('div');
      folderTitle.id = `title-folder-${folder.id}`;
      folderTitle.classList = 'flex-1 text-ellipsis max-h-5 overflow-hidden break-all relative';
      folderTitle.innerText = textInput.value;
      textInput.parentElement.replaceChild(folderTitle, textInput);
      actionsWrapper.replaceWith(folderActions(folder.id));
      skipBlur = false;

      chrome.storage.local.get(['conversationsOrder'], (result) => {
        const { conversationsOrder } = result;
        conversationsOrder.find((f) => f.id === folder.id).name = textInput.value;
        chrome.storage.local.set({ conversationsOrder });
      });
      folderElement.classList.replace('pr-14', 'pr-3');
    } else if (action === 'delete') {
      if (folder.id === 'trash') {
        emptyTrash();
        actionsWrapper.replaceWith(folderActions(folder.id));
      } else {
        deleteFolder(folder);
      }
    }
  });
  const cancelButton = document.createElement('button');
  cancelButton.id = `cancel-${folder.id}`;
  cancelButton.classList = 'p-1 hover:text-white';
  cancelButton.innerHTML = '<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
  cancelButton.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (action === 'edit') {
      const textInput = document.querySelector(`#rename-folder-${folder.id}`);
      const folderTitle = document.createElement('div');
      folderTitle.id = `title-folder-${folder.id}`;
      folderTitle.classList = 'flex-1 text-ellipsis max-h-5 overflow-hidden break-all relative';
      folderTitle.innerText = folder.name;
      textInput.parentElement.replaceChild(folderTitle, textInput);
    }
    actionsWrapper.replaceWith(folderActions(folder.id));
    folderElement.classList.replace('pr-14', 'pr-3');
  });
  actionsWrapper.appendChild(confirmButton);
  actionsWrapper.appendChild(cancelButton);
  const textInput = document.querySelector(`#rename-folder-${folder.id}`);
  if (textInput) {
    textInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.which === 13) {
        skipBlur = true;
        confirmButton.click();
      } else if (e.key === 'Escape') {
        cancelButton.click();
      }
      folderElement.classList.replace('pr-14', 'pr-3');
    });
    textInput.addEventListener('blur', (e) => {
      if (skipBlur) return;
      if (e.relatedTarget?.id === `confirm-${folder.id}`) return;
      cancelButton.click();
      folderElement.classList.replace('pr-14', 'pr-3');
    });
  }
  return actionsWrapper;
}
function emptyTrash() {
  showNewChatPage();
  chrome.storage.local.get(['conversationsOrder', 'conversations'], (result) => {
    const {
      conversations, conversationsOrder,
    } = result;
    const newConversations = {};
    Object.keys(conversations).forEach((key) => {
      if (!conversations[key].archived) {
        newConversations[key] = conversations[key];
      }
    });
    const newConversationsOrder = conversationsOrder;

    const trashFolderContent = document.querySelector('#folder-content-trash');
    if (trashFolderContent) {
      // remove all children
      while (trashFolderContent.firstChild) {
        trashFolderContent.removeChild(trashFolderContent.firstChild);
      }
      trashFolderContent.appendChild(emptyFolderElement('trash'));
    }

    const trashFolder = conversationsOrder?.find((f) => f.id === 'trash');
    trashFolder.conversationIds = [];

    const newValues = {
      conversations: newConversations,
      conversationsOrder: newConversationsOrder.map((f) => {
        if (f.id === 'trash') {
          return trashFolder;
        }
        return f;
      }),
    };

    chrome.storage.local.set(newValues);
  });
}
function deleteFolder(folder) {
  chrome.storage.local.get(['conversationsOrder', 'conversations'], (result) => {
    const {
      conversations, conversationsOrder,
    } = result;
    let newConversationsOrder = conversationsOrder;

    const trashFolder = newConversationsOrder?.find((f) => f.id === 'trash');

    const selectedConversationIds = folder.conversationIds;
    const successfullyDeletedConvIds = [];
    // wait for all deleteConversation to be resolved
    const promises = [];

    for (let i = 0; i < selectedConversationIds.length; i += 1) {
      promises.push(deleteConversation(selectedConversationIds[i]).then((data) => {
        if (data.success) {
          successfullyDeletedConvIds.push(selectedConversationIds[i]);
          const conversationElement = document.querySelector(`#conversation-button-${selectedConversationIds[i]}`);
          if (conversationElement && conversationElement.classList.contains('selected')) {
            showNewChatPage();
          }
          conversationElement.querySelector('[id^=checkbox-wrapper-]').remove();
          conversationElement.querySelector('[id^=actions-wrapper-]').remove();
          conversationElement.classList = notSelectedClassList;
          conversationElement.style.opacity = 0.7;
          conversationElement.classList.remove('hover:pr-14');
          const conversationElementIcon = conversationElement.querySelector('img');
          conversationElementIcon.src = chrome.runtime.getURL('icons/trash.png');
          const trashFolderContent = document.querySelector('#folder-content-trash');
          if (trashFolderContent) {
            const curEmptyFolderElement = trashFolderContent.querySelector('#empty-folder-trash');
            if (curEmptyFolderElement) curEmptyFolderElement.remove();
            // prepend conversation to trash folder
            trashFolderContent.prepend(conversationElement);
          }
        }
      }, () => { }));
    }
    // set archived = true for all selected conversations
    Promise.all(promises).then(() => {
      if (successfullyDeletedConvIds.length === folder.conversationIds.length) {
        // remove folder element
        document.querySelector(`#wrapper-folder-${folder.id}`)?.remove();
        // remove folder from conversationsOrder
        newConversationsOrder = conversationsOrder.filter((f) => f.id !== folder.id);
      }
      const newConversations = conversations
        ? Object.keys(conversations).reduce(
          (acc, key) => {
            if (successfullyDeletedConvIds.includes(key)) {
              acc[key] = {
                ...conversations[key],
                archived: true,
              };
            } else {
              acc[key] = {
                ...conversations[key],
              };
            }
            return acc;
          },
          {},
        )
        : {};
      trashFolder.conversationIds = [...successfullyDeletedConvIds, ...trashFolder.conversationIds];
      // remove duplicate conversationIds
      trashFolder.conversationIds = [...new Set(trashFolder.conversationIds)];
      const newValues = {
        conversations: newConversations,
        conversationsOrder: newConversationsOrder.map((f) => {
          if (f.id === 'trash') {
            return trashFolder;
          }
          return f;
        }),
      };
      chrome.storage.local.set(newValues);
    });
  });
}
