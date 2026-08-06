import React from 'react';
import style from './style.m.scss';

const Loading = () => (
  <div className={style.loading}>
    <div className={style.backdrop}>
      <div className={style.loaderContainer}>
        <div className={style.spinner} />
      </div>
    </div>
  </div>
);

export default Loading;
