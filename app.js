const STORAGE_KEY = 'vibely.posts.v1';
const FOLDERS_KEY = 'vibely.folders.v1';
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const demoPosts = [
  {id:'demo-1',name:'Лера Михайлова',handle:'lera.moves',avatar:'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',verified:true,time:'12 мин назад',text:'Маленькое напоминание: иногда лучший план — просто выйти на улицу и посмотреть, куда приведёт день 🌿',image:'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1100&q=85',likes:128,comments:14,liked:false,saved:false,folder:'Путешествия'},
  {id:'demo-2',name:'Марк Соколов',handle:'mark.create',avatar:'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80',verified:false,time:'38 мин назад',text:'Рабочее место сегодня заряжает на новые идеи. Что слушаете, когда нужно сосредоточиться? 🎧',image:'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1100&q=85',likes:86,comments:9,liked:false,saved:false,folder:'Вдохновение'},
  {id:'demo-3',name:'Соня Ли',handle:'sonya.jpeg',avatar:'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=120&q=80',verified:true,time:'1 ч назад',text:'Сохраняю сюда цвета и настроение этой недели ☀️',image:'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1100&q=85',likes:204,comments:22,liked:false,saved:false,folder:''}
];
const people = [
  {name:'Алиса Громова',handle:'alice.g',avatar:'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=100&q=80'},
  {name:'Даня Орлов',handle:'danya.outside',avatar:'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=100&q=80'},
  {name:'Мила Романова',handle:'mila.roma',avatar:'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=100&q=80'}
];
let posts = loadPosts();
let currentFilter = 'all';
let searchTerm = '';
let selectedFiles = [];
let toastTimer;
function loadPosts(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []}catch{return []}}
function persist(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(posts));return true}catch{showToast('Не удалось сохранить: возможно, закончилась память браузера.');return false}}
function escapeHTML(value=''){return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]))}
function showToast(message){const toast=$('#toast');toast.textContent=message;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),2600)}
function openModal(id){$('#'+id).classList.remove('hidden');document.body.style.overflow='hidden'}
function closeModal(id){$('#'+id).classList.add('hidden');document.body.style.overflow=''}
function allPosts(){return [...posts,...demoPosts]}
function renderFeed(){
  const query=searchTerm.trim().toLowerCase();
  let items=allPosts().filter(post=>{
    const matchesText=!query||`${post.name} ${post.handle} ${post.text} ${post.folder||''}`.toLowerCase().includes(query);
    if(!matchesText)return false;
    if(currentFilter==='popular')return post.likes>=100;
    if(currentFilter==='saved')return post.saved;
    if(currentFilter==='videos')return Boolean(post.video);
    if(currentFilter.startsWith('folder:'))return post.folder===currentFilter.slice(7);
    return true;
  });
  if(currentFilter==='popular')items.sort((a,b)=>b.likes-a.likes);
  $('#feed').replaceChildren(...items.map(createPostCard));
  $('#emptyState').classList.toggle('hidden',items.length>0);
  $('#feedHeading').textContent=currentFilter==='popular'?'Популярное':currentFilter==='saved'?'Сохранённое':currentFilter==='videos'?'Видео':currentFilter.startsWith('folder:')?currentFilter.slice(7):'Твоя лента';
  $('#postCount').textContent=posts.length;
}
function createPostCard(post){
  const card=document.createElement('article');card.className='post-card';
  const head=document.createElement('div');head.className='post-head';
  const avatar=document.createElement('img');avatar.className='post-avatar';avatar.src=post.avatar||'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80';avatar.alt='';avatar.loading='lazy';
  const person=document.createElement('div');person.className='post-person';person.innerHTML=`<strong>${escapeHTML(post.name)}</strong> ${post.verified?'<span class="verified" title="Подтверждённый профиль">✦</span>':''}<small>@${escapeHTML(post.handle)} · ${escapeHTML(post.time||'только что')}</small>`;
  const menu=document.createElement('button');menu.className='post-menu';menu.type='button';menu.textContent='···';menu.setAttribute('aria-label','Действия с публикацией');menu.addEventListener('click',()=>showToast('Дополнительные действия появятся в следующей версии.'));
  head.append(avatar,person,menu);card.append(head);
  if(post.text){const text=document.createElement('div');text.className='post-text';text.textContent=post.text;card.append(text)}
  if(post.image){const img=document.createElement('img');img.className='post-media';img.src=post.image;img.alt='Изображение публикации';img.loading='lazy';card.append(img)}
  if(post.images?.length){const mosaic=document.createElement('div');mosaic.className='post-mosaic';post.images.slice(0,4).forEach(src=>{const img=document.createElement('img');img.src=src;img.alt='Изображение публикации';img.loading='lazy';mosaic.append(img)});card.append(mosaic)}
  if(post.video){const video=document.createElement('video');video.className='post-media';video.src=post.video;video.controls=true;video.preload='metadata';card.append(video)}
  const meta=document.createElement('div');meta.className='post-meta';meta.innerHTML=`<span>♡ ${post.likes} отметок «Нравится»</span><span>${post.comments||0} комментариев</span>`;if(post.folder){const folder=document.createElement('span');folder.className='post-folder';folder.textContent='▣ '+post.folder;meta.append(folder)}card.append(meta);
  const actions=document.createElement('div');actions.className='post-actions';
  const like=document.createElement('button');like.className='post-action'+(post.liked?' liked':'');like.innerHTML=`<span>${post.liked?'♥':'♡'}</span>Нравится`;like.addEventListener('click',()=>togglePost(post.id,'liked'));
  const comment=document.createElement('button');comment.className='post-action';comment.innerHTML='<span>▱</span>Комментировать';comment.addEventListener('click',()=>card.querySelector('.comment-box input').focus());
  const share=document.createElement('button');share.className='post-action';share.innerHTML='<span>↗</span>Поделиться';share.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(location.href);showToast('Ссылка скопирована')}catch{showToast('Скопируй адрес сайта из строки браузера')}});
  const save=document.createElement('button');save.className='post-action'+(post.saved?' saved':'');save.innerHTML=`<span>${post.saved?'▣':'▢'}</span>`;save.title=post.saved?'Убрать из сохранённого':'Сохранить';save.setAttribute('aria-label',save.title);save.addEventListener('click',()=>togglePost(post.id,'saved'));
  actions.append(like,comment,share,save);card.append(actions);
  const comments=document.createElement('div');comments.className='comments-list';(post.userComments||[]).forEach(item=>{const row=document.createElement('div');row.className='comment';const strong=document.createElement('b');strong.textContent=item.name;row.append(strong,document.createTextNode(item.text));comments.append(row)});if(comments.childElementCount)card.append(comments);
  const form=document.createElement('form');form.className='comment-box';const input=document.createElement('input');input.placeholder='Напиши комментарий…';input.maxLength=240;input.setAttribute('aria-label','Комментарий');const submit=document.createElement('button');submit.type='submit';submit.textContent='Ответить';form.append(input,submit);form.addEventListener('submit',event=>{event.preventDefault();const value=input.value.trim();if(!value)return;const custom=posts.find(item=>item.id===post.id);if(!custom){showToast('Комментарии к демо-публикациям скоро появятся.');return}custom.userComments=custom.userComments||[];custom.userComments.push({name:'Александр',text:value});custom.comments=(custom.comments||0)+1;persist();renderFeed()});card.append(form);
  return card;
}
function togglePost(id,key){const post=posts.find(item=>item.id===id);if(!post){showToast('Это пример публикации. Создай свою, чтобы проверить функцию.');return}if(key==='liked'){post.liked=!post.liked;post.likes+=post.liked?1:-1}else post.saved=!post.saved;persist();renderFeed()}
function renderStories(){const row=$('#storiesRow');const add=$('#addStory');row.replaceChildren(add);people.forEach((person,index)=>{const button=document.createElement('button');button.className='story';button.innerHTML=`<span class="story-ring"><img src="${escapeHTML(person.avatar)}" alt="" loading="lazy"></span><span>${['Лера','Марк','Соня'][index]}</span>`;button.addEventListener('click',()=>showToast('Истории пользователей скоро появятся.'));row.append(button)});posts.slice(0,5).forEach((post,index)=>{const button=document.createElement('button');button.className='story';const letter=escapeHTML((post.name||'А').slice(0,1));button.innerHTML=`<span class="story-ring"><span class="story-initial">${letter}</span></span><span>Моя история</span>`;button.addEventListener('click',()=>showToast('Истории будут доступны в следующем обновлении.'));row.append(button)})}
function renderSuggestions(){const list=$('#suggestionsList');list.replaceChildren(...people.map(person=>{const row=document.createElement('div');row.className='suggestion';const img=document.createElement('img');img.src=person.avatar;img.alt='';img.loading='lazy';const info=document.createElement('div');info.className='suggestion-info';info.innerHTML=`<b>${escapeHTML(person.name)}</b><small>@${escapeHTML(person.handle)}</small>`;const follow=document.createElement('button');follow.className='follow-button';follow.textContent='Подписаться';follow.addEventListener('click',()=>{follow.classList.toggle('following');follow.textContent=follow.classList.contains('following')?'Вы подписаны':'Подписаться'});row.append(img,info,follow);return row}))}
function setFilter(filter){currentFilter=filter;$$('.nav-item').forEach(button=>button.classList.toggle('active',button.dataset.filter===filter));$$('.mobile-nav [data-filter]').forEach(button=>button.classList.toggle('active',button.dataset.filter===filter));renderFeed();window.scrollTo({top:0,behavior:'smooth'})}
function showInfo(title,content){$('#infoTitle').textContent=title;$('#infoContent').innerHTML=content;openModal('infoModal')}
function renderFolders(){let folders;try{folders=JSON.parse(localStorage.getItem(FOLDERS_KEY))||['Вдохновение','Путешествия']}catch{folders=['Вдохновение','Путешествия']}const list=$('#folderList');list.replaceChildren(...folders.map((name,index)=>{const button=document.createElement('button');button.className='folder-item';button.dataset.folder=name;const dot=document.createElement('span');dot.className='folder-dot '+(index%2?'purple':'peach');button.append(dot,document.createTextNode(name));button.addEventListener('click',()=>setFilter('folder:'+name));return button}));const select=$('#postFolder');select.replaceChildren(new Option('Без папки',''),...folders.map(name=>new Option(name,name)))}
$('#bannerCompose').addEventListener('click',()=>openModal('postModal'));
$('#mobileCompose').addEventListener('click',()=>openModal('postModal'));
$('#mobileNavCompose').addEventListener('click',()=>openModal('postModal'));
$('#chooseFiles').addEventListener('click',()=>$('#mediaInput').click());
$('#uploadArea').addEventListener('click',event=>{if(event.target.id==='uploadArea'||event.target.classList.contains('upload-icon'))$('#mediaInput').click()});
$('#mediaInput').addEventListener('change',event=>{selectedFiles=[...event.target.files].filter(file=>file.size<=20*1024*1024);if(event.target.files.length!==selectedFiles.length)showToast('Файлы больше 20 МБ не добавлены.');$('#fileNames').textContent=selectedFiles.map(file=>file.name).join(' · ')||'Файл не выбран'});
$('#postForm').addEventListener('submit',event=>{event.preventDefault();const text=$('#postText').value.trim();if(!text&&!selectedFiles.length){showToast('Добавь текст, фото или видео.');return}const media=selectedFiles.map(file=>({file,url:URL.createObjectURL(file)}));const images=media.filter(item=>item.file.type.startsWith('image/')).map(item=>item.url);const video=media.find(item=>item.file.type.startsWith('video/'))?.url;const post={id:crypto.randomUUID?.()||String(Date.now()),name:'Александр К.',handle:'alexander',avatar:'',verified:false,time:'только что',text,likes:0,comments:0,liked:false,saved:false,folder:$('#postFolder').value,userComments:[],...(images.length===1?{image:images[0]}:{}),...(images.length>1?{images}:{}),...(video?{video}:{})};posts.unshift(post);persist();renderFeed();renderStories();closeModal('postModal');$('#postForm').reset();$('#fileNames').textContent='';selectedFiles=[];setFilter('all');showToast('Публикация добавлена! Она видна только в этом браузере.')});
$('#searchInput').addEventListener('input',event=>{searchTerm=event.target.value;renderFeed()});
$$('.nav-item').forEach(button=>button.addEventListener('click',()=>setFilter(button.dataset.filter)));
$$('.mobile-nav [data-filter]').forEach(button=>button.addEventListener('click',()=>setFilter(button.dataset.filter)));
$('#resetFeed').addEventListener('click',()=>{searchTerm='';$('#searchInput').value='';setFilter('all')});
$('#sortButton').addEventListener('click',()=>showToast('Сортировка «Для тебя» активна.'));
$('#allStories').addEventListener('click',()=>showToast('Истории появятся в следующем обновлении.'));
$('#addStory').addEventListener('click',()=>showToast('Добавление историй скоро появится.'));
$('#addFolder').addEventListener('click',()=>{const name=prompt('Название новой папки:');if(!name?.trim())return;let folders;try{folders=JSON.parse(localStorage.getItem(FOLDERS_KEY))||['Вдохновение','Путешествия']}catch{folders=[]}if(folders.includes(name.trim())){showToast('Такая папка уже есть.');return}folders.push(name.trim().slice(0,30));localStorage.setItem(FOLDERS_KEY,JSON.stringify(folders));renderFolders();showToast('Папка создана')});
$('#ownerPanel').addEventListener('click',()=>showInfo('Панель владельца',`<p class="info-copy">Это демонстрационный экран. Сейчас Vibely — клиентская демо-версия, поэтому нет настоящих аккаунтов, серверных данных и управления пользователями.</p><div class="stats-grid"><div class="stat-tile"><b>${posts.length}</b><span>локальных публикаций</span></div><div class="stat-tile"><b>0</b><span>подключённых аккаунтов</span></div><div class="stat-tile"><b>—</b><span>серверная база</span></div></div><p class="info-copy">Для публичной работы следующим шагом подключим безопасную авторизацию, базу данных и хранилище файлов. Не добавляй сюда реальные пароли или личные данные.</p>`));
$('#editProfile').addEventListener('click',()=>showToast('Редактирование профиля добавим после настройки аккаунтов.'));
$('#seePeople').addEventListener('click',()=>showToast('Каталог пользователей появится после подключения базы данных.'));
$('#mobileProfile').addEventListener('click',()=>showToast('Профи��ь пока демонстрационный.'));
$$('[data-close]').forEach(button=>button.addEventListener('click',()=>closeModal(button.dataset.close)));
$$('.modal-backdrop').forEach(backdrop=>backdrop.addEventListener('click',event=>{if(event.target===backdrop)closeModal(backdrop.id)}));
document.addEventListener('keydown',event=>{if(event.key==='Escape')$$('.modal-backdrop:not(.hidden)').forEach(modal=>closeModal(modal.id));if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();$('#searchInput').focus()}});
renderFolders();renderStories();renderSuggestions();renderFeed();
