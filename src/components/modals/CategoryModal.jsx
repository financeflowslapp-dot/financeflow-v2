import {useState} from 'react'
import {DndContext,closestCenter,PointerSensor,TouchSensor,useSensor,useSensors} from '@dnd-kit/core'
import {SortableContext,useSortable,verticalListSortingStrategy} from '@dnd-kit/sortable'
import {CSS} from '@dnd-kit/utilities'
import {Modal} from '../ui/Modal.jsx'
function SortableChip({category,onDelete}){
  const{attributes,listeners,setNodeRef,transform,transition,isDragging}=useSortable({id:category.id})
  const style={transform:CSS.Transform.toString(transform),transition,opacity:isDragging?0.4:1,position:'relative',zIndex:isDragging?10:'auto'}
  return(
    <span ref={setNodeRef} style={style} className={`category-chip${isDragging?' dragging':''}`}>
      <span className="drag-handle" {...attributes} {...listeners}>⠿</span>
      {category.name}
      <button type="button" className="chip-delete" onClick={()=>onDelete(category.id)}>×</button>
    </span>
  )
}
function CatSection({title,type,cats,val,setVal,onAdd,onDelete,onReorder}){
  const sensors=useSensors(
    useSensor(PointerSensor,{activationConstraint:{distance:5}}),
    useSensor(TouchSensor,{activationConstraint:{delay:150,tolerance:8}})
  )
  function handleDragEnd({active,over}){
    if(!over||active.id===over.id)return
    onReorder(type,cats.findIndex(c=>c.id===active.id),cats.findIndex(c=>c.id===over.id))
  }
  return(
    <section className="category-section">
      <h3 style={{fontSize:13,fontWeight:700,textTransform:'uppercase',letterSpacing:'.05em',color:'var(--ink-muted)',marginBottom:10}}>{title}</h3>
      <form className="category-add-row" onSubmit={e=>{e.preventDefault();onAdd(type)}}>
        <input type="text" placeholder="New category name" value={val} onChange={e=>setVal(e.target.value)}/>
        <button type="submit" className="btn btn-primary btn-sm">Add</button>
      </form>
      {cats.length===0?<p className="muted" style={{fontSize:13}}>No categories yet.</p>:(
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={cats.map(c=>c.id)} strategy={verticalListSortingStrategy}>
            <div className="category-chip-list">
              {cats.map(c=><SortableChip key={c.id} category={c} onDelete={onDelete}/>)}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </section>
  )
}
export function CategoryModal({incomeCategories,expenseCategories,onAdd,onDelete,onReorder,onClose,error}){
  const[ni,setNi]=useState('');const[ne,setNe]=useState('')
  async function handleAdd(type){const ok=await onAdd(type==='income'?ni:ne,type,type==='income'?incomeCategories:expenseCategories);if(ok){type==='income'?setNi(''):setNe('')}}
  return(
    <Modal title="Manage Categories" onClose={onClose}>
      {error&&<p className="form-error">{error}</p>}
      <CatSection title="Income" type="income" cats={incomeCategories} val={ni} setVal={setNi} onAdd={handleAdd} onDelete={onDelete} onReorder={onReorder}/>
      <CatSection title="Expense" type="expense" cats={expenseCategories} val={ne} setVal={setNe} onAdd={handleAdd} onDelete={onDelete} onReorder={onReorder}/>
    </Modal>
  )
}
