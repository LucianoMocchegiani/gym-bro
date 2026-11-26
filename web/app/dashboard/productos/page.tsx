                {canWrite ? (
                  <RowIconButton label="Editar producto" onClick={() => go(`editar=${product.id}`)}><IconEdit /></RowIconButton>
                ) : null}
