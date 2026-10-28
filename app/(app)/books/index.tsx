import React from 'react';
import BooksScreen from '../../../src/screens/books/BooksScreen';
import BooksCompanyWorkspace from '../../../src/screens/books/BooksCompanyContext';
export default function BooksRoute() { return <BooksCompanyWorkspace><BooksScreen /></BooksCompanyWorkspace>; }
